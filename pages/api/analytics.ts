import { NextApiRequest, NextApiResponse } from 'next';
import type { Prisma } from '@prisma/client';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { checkPlan } from '../../lib/planGuard';

type AnalyticsResponse = {
  totalJobs: number;
  completedJobs: number;
  openJobs: number;
  averageDurationMinutes: number | null;
  averagePhotosPerJob: number;
  topTreatments: Array<{ treatment: string; count: number }>;
  technicianPerformance: Array<{ technicianId: string; technicianName: string; jobs: number; averageDurationMinutes: number | null; }>; 
  routePlan: Array<{ address: string; clientName: string; scheduledAt: string; treatment: string; }>;
  auditSummary: {
    missingPhotos: number;
    missingSignatures: number;
    missingStatus: number;
  };
};

async function resolveCompanyForUser(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user?.email) return null;

  const directCompany = await prisma.company.findUnique({
    where: { email: user.email },
    select: { id: true, plan: true, subscriptionStatus: true, notificationPreferences: true },
  });
  if (directCompany) return directCompany;

  const technician = await prisma.technician.findFirst({
    where: { email: user.email },
    include: { company: { select: { id: true, plan: true, subscriptionStatus: true, notificationPreferences: true } } },
  });
  return technician?.company ?? null;
}

function shouldFallbackFromPhotosRelation(error: unknown): boolean {
  const message = String(error);
  return message.includes('LogbookPhoto') || message.includes('photos');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const company = await resolveCompanyForUser(token);
    if (!company) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const plan = company.plan ?? 'trial';
    if (!checkPlan(plan, ['business', 'enterprise'])) {
      return res.status(403).json({ error: 'Business plan required for analytics and route optimization.' });
    }

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const technicianId = typeof req.query.technicianId === 'string' ? req.query.technicianId : undefined;

    const whereClause: Prisma.LogbookEntryWhereInput = {
      companyId: company.id,
      date: { gte: startDate, lte: endDate },
    };

    if (technicianId) {
      whereClause.logbookEntryTechnicians = {
        some: {
          technicianId,
        },
      };
    }

    let entries;
    try {
      entries = await prisma.logbookEntry.findMany({
        where: whereClause,
        include: {
          photos: { select: { url: true } },
          logbookEntryTechnicians: {
            include: { technician: { select: { id: true, name: true } } },
          },
        },
        orderBy: { date: 'desc' },
      });
    } catch (err) {
      if (!shouldFallbackFromPhotosRelation(err)) throw err;
      const fallback = await prisma.logbookEntry.findMany({
        where: whereClause,
        include: {
          logbookEntryTechnicians: {
            include: { technician: { select: { id: true, name: true } } },
          },
        },
        orderBy: { date: 'desc' },
      });
      entries = fallback.map(e => ({ ...e, photos: [] }));
    }

    const jobCountByTechnicianMap = new Map<string, { technicianName: string; jobs: number; durationMinutes: number; durations: number[] }>();
    let totalDurationMinutes = 0;
    let durationCount = 0;
    let photosTotal = 0;
    let missingPhotos = 0;
    let missingSignatures = 0;
    let missingStatus = 0;

    const treatmentCounts = new Map<string, number>();

    entries.forEach((entry) => {
      const photoCount = (entry.photos?.length || 0) + (entry.photoUrl ? 1 : 0);
      photosTotal += photoCount;
      if (photoCount === 0) missingPhotos += 1;
      if (!entry.signature) missingSignatures += 1;
      if (!entry.status || entry.status === 'open') missingStatus += 1;

      const durationMinutes = entry.startTime && entry.endTime ? (entry.endTime.getTime() - entry.startTime.getTime()) / (1000 * 60) : null;
      if (durationMinutes !== null && !Number.isNaN(durationMinutes)) {
        totalDurationMinutes += durationMinutes;
        durationCount += 1;
      }

      const treatmentKey = entry.treatment || 'Unknown';
      treatmentCounts.set(treatmentKey, (treatmentCounts.get(treatmentKey) || 0) + 1);

      entry.logbookEntryTechnicians.forEach((join) => {
        if (!join.technician) return;
        const techId = join.technician.id;
        const techName = join.technician.name;
        const existing = jobCountByTechnicianMap.get(techId) ?? { technicianName: techName, jobs: 0, durationMinutes: 0, durations: [] };
        existing.jobs += 1;
        if (durationMinutes !== null && !Number.isNaN(durationMinutes)) {
          existing.durationMinutes += durationMinutes;
          existing.durations.push(durationMinutes);
        }
        jobCountByTechnicianMap.set(techId, existing);
      });
    });

    const totalJobs = entries.length;
    const completedJobs = entries.filter((entry) => entry.status !== 'open').length;
    const openJobs = totalJobs - completedJobs;

    const technicianPerformance = Array.from(jobCountByTechnicianMap.entries()).map(([technicianId, data]) => ({
      technicianId,
      technicianName: data.technicianName,
      jobs: data.jobs,
      averageDurationMinutes: data.durations.length > 0 ? Math.round(data.durationMinutes / data.durations.length) : null,
    })).sort((a, b) => b.jobs - a.jobs);

    const topTreatments = Array.from(treatmentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([treatment, count]) => ({ treatment, count }));

    const orderedRoute = entries
      .slice()
      .sort((a, b) => {
        const aTime = a.startTime ? a.startTime.getTime() : a.date.getTime();
        const bTime = b.startTime ? b.startTime.getTime() : b.date.getTime();
        return aTime - bTime;
      })
      .slice(0, 10)
      .map((entry) => ({
        address: entry.address,
        clientName: entry.clientName,
        scheduledAt: entry.startTime ? new Date(entry.startTime).toLocaleString() : new Date(entry.date).toLocaleString(),
        treatment: entry.treatment,
      }));

    const response: AnalyticsResponse = {
      totalJobs,
      completedJobs,
      openJobs,
      averageDurationMinutes: durationCount > 0 ? Math.round(totalDurationMinutes / durationCount) : null,
      averagePhotosPerJob: totalJobs > 0 ? Number((photosTotal / totalJobs).toFixed(1)) : 0,
      topTreatments,
      technicianPerformance,
      routePlan: orderedRoute,
      auditSummary: {
        missingPhotos,
        missingSignatures,
        missingStatus,
      },
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error('Analytics API error:', err);
    return res.status(500).json({ error: 'Analytics request failed', details: String(err) });
  }
}
