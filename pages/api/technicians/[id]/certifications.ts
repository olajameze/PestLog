import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../lib/prisma';
import { checkPlan } from '../../../../lib/planGuard';
import { supabase } from '../../../../lib/supabase';
import { normalizeAuthEmail } from '../../../../lib/auth/userSession';
import { technicianEmailWhere } from '../../../../lib/auth/technicianGate';

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

  const authEmail = normalizeAuthEmail(user.email);
  const company = await prisma.company.findUnique({
    where: { email: authEmail },
    select: { id: true, plan: true, subscriptionStatus: true },
  });

  const technicianActor = await prisma.technician.findFirst({
    where: technicianEmailWhere(authEmail),
    select: { id: true, companyId: true },
  });

  const requestedTechnicianId = id as string;

  if (!company && !technicianActor) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!company) {
    if (!technicianActor || technicianActor.id !== requestedTechnicianId) {
      return res.status(403).json({ error: 'Technicians can only view their own certifications.' });
    }
    const certifications = await prisma.certification.findMany({
      where: { technicianId: requestedTechnicianId },
      orderBy: { uploadedAt: 'desc' },
    });
    return res.status(200).json(certifications);
  }

  const hasPremiumAccess = company.plan
    ? checkPlan(company.plan, ['pro', 'business', 'enterprise'])
    : company.subscriptionStatus === 'active';

  // Plan gating for cert viewing (Pro+)
  if (!hasPremiumAccess) {
    return res.status(403).json({ error: 'Pro plan required to view certifications' });
  }

  const requestedTechnician = await prisma.technician.findUnique({
    where: { id: requestedTechnicianId },
    select: { companyId: true },
  });
  if (!requestedTechnician || requestedTechnician.companyId !== company.id) {
    return res.status(404).json({ error: 'Technician not found' });
  }

  const certifications = await prisma.certification.findMany({
    where: { technicianId: requestedTechnicianId },
    orderBy: { uploadedAt: 'desc' },
  });

  return res.status(200).json(certifications);
}

