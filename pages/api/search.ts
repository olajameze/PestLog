import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { searchAll } from '../../lib/search/fullText';
import { hasSubscriptionAccess } from '../../lib/subscriptionAccess';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const q = typeof req.query.q === 'string' ? req.query.q : '';
  if (!q.trim()) return res.status(200).json([]);

  const company = await prisma.company.findUnique({
    where: { email: user.email },
    select: { id: true, plan: true, subscriptionStatus: true, trialEndsAt: true },
  });

  if (company) {
    if (!hasSubscriptionAccess(company)) {
      return res.status(403).json({ error: 'Trial expired. Upgrade required to continue using Pest Trace.' });
    }
    const hits = await searchAll(prisma, company.id, q);
    return res.status(200).json(hits);
  }

  const technician = await prisma.technician.findFirst({
    where: { email: user.email },
    select: {
      id: true,
      companyId: true,
      company: {
        select: { plan: true, subscriptionStatus: true, trialEndsAt: true },
      },
    },
  });
  if (!technician) return res.status(404).json({ error: 'Company or technician not found' });
  if (!hasSubscriptionAccess(technician.company)) {
    return res.status(403).json({ error: 'Trial expired. Upgrade required to continue using Pest Trace.' });
  }

  const hits = await searchAll(prisma, technician.companyId, q, technician.id);
  return res.status(200).json(hits);
}

