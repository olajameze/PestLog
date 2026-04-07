import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const { companyId } = req.query;
      const company = await prisma.company.findFirst({
        where: { id: companyId as string, email: user.email },
      });
      if (!company) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const entries = await prisma.logbookEntry.findMany({
        where: { companyId: companyId as string },
        orderBy: { date: 'desc' },
      });
      return res.status(200).json(entries);
    } else if (req.method === 'POST') {
      const { companyId, date, clientName, address, treatment, notes, technicianId, photoUrl } = req.body;
      const company = await prisma.company.findFirst({
        where: { id: companyId, email: user.email },
      });
      if (!company) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const technician = await prisma.technician.findFirst({
        where: { id: technicianId, companyId },
      });
      if (!technician) {
        return res.status(400).json({ error: 'Invalid technician' });
      }
      const entry = await prisma.logbookEntry.create({
        data: {
          companyId,
          technicianId: technician.id,
          date: new Date(date),
          clientName,
          address,
          treatment,
          notes,
          photoUrl: photoUrl || null,
        },
      });
      return res.status(201).json(entry);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (err) {
    return res.status(500).json({ error: 'Logbook request failed', details: String(err) });
  }
}