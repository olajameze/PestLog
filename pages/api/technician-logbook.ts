import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user || !user.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const technician = await prisma.technician.findFirst({
    where: { email: user.email },
  });

  if (!technician) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (req.method === 'GET') {
    const entries = await prisma.logbookEntry.findMany({
      where: { technicianId: technician.id },
      orderBy: { date: 'desc' },
    });
    return res.status(200).json(entries);
  }

  if (req.method === 'POST') {
    const { date, clientName, address, treatment, notes, photoUrl, signature } = req.body;

    if (!date || !clientName || !address || !treatment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const entry = await prisma.logbookEntry.create({
      data: {
        companyId: technician.companyId,
        technicianId: technician.id,
        date: new Date(date),
        clientName,
        address,
        treatment,
        notes,
        photoUrl,
        signature,
      },
    });

    return res.status(201).json(entry);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
