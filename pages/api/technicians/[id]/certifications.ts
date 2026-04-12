import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { checkPlan } from '../../../../lib/planGuard';
import { supabase } from '../../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).end('Method Not Allowed');
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const company = await prisma.company.findUnique({
    where: { email: user.email },
    select: { id: true, plan: true, subscriptionStatus: true },
  });

  if (!company) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const hasPremiumAccess = company.plan
    ? checkPlan(company.plan, ['pro', 'business', 'enterprise'])
    : company.subscriptionStatus === 'active';

  // Plan gating for cert viewing (Pro+)
  if (!hasPremiumAccess) {
    return res.status(403).json({ error: 'Pro plan required to view certifications' });
  }

  const certifications = await prisma.certification.findMany({
    where: { technicianId: id as string },
    orderBy: { uploadedAt: 'desc' },
  });

  return res.status(200).json(certifications);
}

