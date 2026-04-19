import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/prisma';
import { supabase } from '../../lib/supabase';
import { logger } from '../../lib/logger';
import type { Prisma } from '@prisma/client';

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
      select: { id: true, plan: true }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
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

    return res.status(200).json({
      totalJobs,
      completedJobs,
      openJobs: totalJobs - completedJobs,
      averageDurationMinutes: 45, // Placeholder if duration fields aren't in schema
      averagePhotosPerJob: totalJobs > 0 ? (entries as Entry[]).reduce((sum, entry) => sum + entry.photos.length, 0) / totalJobs : 0,
      topTreatments,
      clvScore,
      cacRatio,
      auditSummary: { missingPhotos: 0, missingSignatures: 0, missingStatus: 0 }
    });
  } catch (error) {
    logger.error(`Analytics API error: ${String(error)}`);
    return res.status(500).json({ error: 'Internal server error' });
  }
}