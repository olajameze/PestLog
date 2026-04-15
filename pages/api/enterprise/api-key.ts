import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { prisma } from '../../../lib/prisma';

async function resolveCompanyForUser(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user?.email) return null;

  const company = await prisma.company.findUnique({
    where: { email: user.email },
    select: { id: true, plan: true, notificationPreferences: true, subscriptionStatus: true },
  });
  if (company) return company;

  const technician = await prisma.technician.findFirst({
    where: { email: user.email },
    include: { company: { select: { id: true, plan: true, notificationPreferences: true, subscriptionStatus: true } } },
  });
  return technician?.company ?? null;
}

function generateApiKey() {
  return `pt_${crypto.randomUUID().replace(/-/g, '')}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'POST'].includes(req.method || '')) {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const company = await resolveCompanyForUser(token);
  if (!company) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (company.plan !== 'enterprise') {
    return res.status(403).json({ error: 'Enterprise plan required for API access.' });
  }

  const preferences = (company.notificationPreferences ?? {}) as Record<string, unknown>;
  const currentApiKey = typeof preferences.apiKey === 'string' ? preferences.apiKey : null;

  if (req.method === 'GET') {
    return res.status(200).json({ apiKey: currentApiKey });
  }

  const newApiKey = generateApiKey();
  const updatedPreferences = { ...preferences, apiKey: newApiKey };
  const updated = await prisma.company.update({
    where: { id: company.id },
    data: { notificationPreferences: updatedPreferences },
    select: { notificationPreferences: true },
  });

  const returnedPreferences = updated.notificationPreferences as Record<string, unknown>;
  return res.status(200).json({ apiKey: typeof returnedPreferences?.apiKey === 'string' ? returnedPreferences.apiKey : newApiKey });
}
