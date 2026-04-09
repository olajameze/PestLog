import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { supabase } from '../../../lib/supabase';
import { checkPlan } from '../../../lib/planGuard';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ID' });
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
    select: { id: true, plan: true },
  });
  if (!company) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!checkPlan(company.plan ?? 'trial', ['pro', 'business', 'enterprise'])) {
    return res.status(403).json({ error: 'Pro plan required' });
  }

  if (req.method === 'PUT') {
    const { date, clientName, address, treatment, notes, photoUrls, signature } = req.body;
    if (!date || !clientName || !address || !treatment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const entry = await prisma.logbookEntry.update({
      where: { id },
      data: {
        date: new Date(date),
        clientName,
        address,
        treatment,
        notes,
        photoUrl: photoUrls?.length > 1 ? JSON.stringify(photoUrls) : photoUrls?.[0] || null,
        signature,
      },
    });
    return res.status(200).json(entry);
  }

  if (req.method === 'DELETE') {
    await prisma.logbookEntry.delete({
      where: { id },
    });
    return res.status(200).json({ message: 'Entry deleted' });
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

