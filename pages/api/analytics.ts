import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import type { Prisma } from '@prisma/client';
import { hasSubscriptionAccess } from '../../lib/subscriptionAccess';
import {
  getRequestIp,
  isIpAllowed,
  parseEnterpriseSettings,
} from '../../lib/enterpriseFeatures';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { technicianId, startDate, endDate } = req.query;

  try {
    // 1. Get the company associated with the user
    const company = await prisma.company.findUnique({
      where: { email: user.email },
      select: { id: true, plan: true, subscriptionStatus: true, trialEndsAt: true, notificationPreferences: true }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    if (!hasSubscriptionAccess(company)) {
      return res.status(403).json({ error: 'Trial expired. Upgrade required to continue using Pest Trace.' });
    }
    const enterpriseSettings = parseEnterpriseSettings(company.notificationPreferences);
    if (company.plan === 'enterprise') {
      if (enterpriseSettings.security.requireVerifiedEmail) {
        const userVerified = Boolean(
          (user as { email_confirmed_at?: string | null } | null)?.email_confirmed_at,
        );
        if (!userVerified) {
          return res.status(403).json({
            error: 'Email verification is required by enterprise security policy.',
          });
        }
      }
      if (enterpriseSettings.security.ipAllowlistEnabled) {
        const ip = getRequestIp(req);
        if (!isIpAllowed(ip, enterpriseSettings.security.allowedIps)) {
          return res.status(403).json({ error: 'Your IP is not allowed by enterprise security policy.' });
        }
      }
    }

    // 2. Fetch logbook entries with price data
    const entries = await prisma.logbookEntry.findMany({
      where: {
        companyId: company.id,
        ...(technicianId && {
          logbookEntryTechnicians: {
            some: { technicianId: String(technicianId) }
          }
        }),
        date: {
          gte: startDate ? new Date(String(startDate)) : undefined,
          lte: endDate ? new Date(String(endDate)) : undefined,
        }
      },
      include: {
        photos: true,
        logbookEntryTechnicians: true
      }
    });

    type Entry = Prisma.LogbookEntryGetPayload<{
      include: { photos: true; logbookEntryTechnicians: true };
    }>;

    // 3. Calculation Logic
    const totalJobs = entries.length;
    const completedJobs = (entries as Entry[]).filter((entry) => entry.status === 'completed').length;
    const cancelledJobs = (entries as Entry[]).filter((entry) => {
      const status = entry.status?.toLowerCase();
      return status === 'cancelled' || status === 'canceled';
    }).length;
    
    // Revenue-based metrics (Business/Enterprise only)
    const totalRevenue = (entries as Entry[]).reduce((sum, entry) => {
      return sum + (entry.price ? Number(entry.price) : 0);
    }, 0);

    // Identify unique clients in this period to calculate CLV
    const uniqueClients = new Set((entries as Entry[]).map((entry) => `${entry.clientName}-${entry.address}`));
    
    // CLV = Total Revenue / Total Unique Clients
    const clvScore = uniqueClients.size > 0 
      ? Math.round(totalRevenue / uniqueClients.size) 
      : 0;

    // CAC Logic: Usually retrieved from marketing integrations or company settings.
    // For now, we use a placeholder or derived constant.
    const estimatedCAC = 150; // Example: £150 per customer acquisition
    const cacRatio = estimatedCAC > 0 ? Number((clvScore / estimatedCAC).toFixed(2)) : 0;

    // 4. Group Top Treatments
    const treatmentCounts = (entries as Entry[]).reduce((acc: Record<string, number>, curr) => {
      acc[curr.treatment] = (acc[curr.treatment] || 0) + 1;
      return acc;
    }, {});

    const topTreatments = Object.entries(treatmentCounts)
      .map(([treatment, count]): { treatment: string; count: number } => ({ treatment, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const cancellationReasonCounts = (entries as Entry[]).reduce((acc: Record<string, number>, entry) => {
      const status = entry.status?.toLowerCase();
      if (status !== 'cancelled' && status !== 'canceled') return acc;
      const reason = entry.recommendation?.trim() || 'No reason logged';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});

    const npsInRange = enterpriseSettings.npsResponses.filter((response) => {
      const at = new Date(response.submittedAt);
      if (Number.isNaN(at.getTime())) return false;
      if (startDate && at < new Date(String(startDate))) return false;
      if (endDate && at > new Date(String(endDate))) return false;
      return true;
    });
    const promoters = npsInRange.filter((response) => response.score >= 9).length;
    const detractors = npsInRange.filter((response) => response.score <= 6).length;
    const npsScore =
      npsInRange.length === 0 ? undefined : Math.round(((promoters - detractors) / npsInRange.length) * 100);
    const csatScore =
      npsInRange.length === 0
        ? undefined
        : Number((npsInRange.reduce((sum, item) => sum + item.score / 2, 0) / npsInRange.length).toFixed(1));
    const churnRate = totalJobs === 0 ? 0 : Number(((cancelledJobs / totalJobs) * 100).toFixed(1));
    const retentionRate = totalJobs === 0 ? 0 : Number((((totalJobs - cancelledJobs) / totalJobs) * 100).toFixed(1));
    const trendBuckets = 6;
    const rangeStartDate = startDate ? new Date(String(startDate)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rangeEndDate = endDate ? new Date(String(endDate)) : new Date();
    const npsTrend: number[] = [];
    for (let idx = 0; idx < trendBuckets; idx += 1) {
      const from = new Date(
        rangeStartDate.getTime() +
          (idx * (rangeEndDate.getTime() - rangeStartDate.getTime())) / trendBuckets,
      );
      const to = new Date(
        rangeStartDate.getTime() +
          ((idx + 1) * (rangeEndDate.getTime() - rangeStartDate.getTime())) / trendBuckets,
      );
      const slice = npsInRange.filter((response) => {
        const at = new Date(response.submittedAt);
        return at >= from && at < to;
      });
      if (slice.length === 0) {
        npsTrend.push(0);
        continue;
      }
      const bucketPromoters = slice.filter((response) => response.score >= 9).length;
      const bucketDetractors = slice.filter((response) => response.score <= 6).length;
      npsTrend.push(Math.round(((bucketPromoters - bucketDetractors) / slice.length) * 100));
    }

    return res.status(200).json({
      totalJobs,
      completedJobs,
      openJobs: totalJobs - completedJobs,
      averageDurationMinutes: 45, // Placeholder if duration fields aren't in schema
      averagePhotosPerJob: totalJobs > 0 ? (entries as Entry[]).reduce((sum, entry) => sum + entry.photos.length, 0) / totalJobs : 0,
      topTreatments,
      clvScore,
      cacRatio,
      retentionRate,
      churnRate,
      csatScore,
      npsScore,
      npsTrend,
      cancellationReasons: Object.entries(cancellationReasonCounts)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      auditSummary: { missingPhotos: 0, missingSignatures: 0, missingStatus: 0 }
    });
  } catch (error) {
    logger.error(`Analytics API error: ${String(error)}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
}