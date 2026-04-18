import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { buildDashboardInsights } from '../../lib/dashboardInsights';
import type { DashboardDateRangeOption } from '../../lib/api/mockDashboardData';

async function resolveCompanyForUser(token: string) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user?.email) return null;

  const direct = await prisma.company.findUnique({
    where: { email: user.email },
    select: {
      id: true,
      requirePhotos: true,
      requireSignature: true,
    },
  });
  if (direct) return direct;

  const technician = await prisma.technician.findFirst({
    where: { email: user.email },
    include: {
      company: {
        select: { id: true, requirePhotos: true, requireSignature: true },
      },
    },
  });
  return technician?.company ?? null;
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
  const company = await resolveCompanyForUser(token);
  if (!company) {
    return res.status(403).json({ error: 'Company not found' });
  }

  const raw = req.query.range;
  const range: DashboardDateRangeOption =
    raw === '7' || raw === '30' || raw === '90' ? raw : '30';

  try {
    const data = await buildDashboardInsights(prisma, company.id, company, range);
    return res.status(200).json(data);
  } catch (error) {
    console.error('dashboard-insights', error);
    return res.status(500).json({ error: 'Failed to load dashboard insights' });
  }
}
