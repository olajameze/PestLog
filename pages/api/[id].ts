import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user?.email) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.query;

    if (req.method === 'DELETE') {
      const company = await prisma.company.findFirst({
        where: { email: user.email },
      });

      if (!company) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Verify entry belongs to company
      const entry = await prisma.logbookEntry.findFirst({
        where: { id: id as string, companyId: company.id },
      });

      if (!entry) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      // Delete related records manually if relations aren't CASCADE
      await prisma.logbookEntryTechnician.deleteMany({ where: { logbookEntryId: entry.id } });
      await prisma.logbookPhoto.deleteMany({ where: { logbookEntryId: entry.id } });

      await prisma.logbookEntry.delete({
        where: { id: entry.id },
      });

      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error('Logbook Entry [id] error:', err);
    return res.status(500).json({ error: 'Operation failed', details: String(err) });
  }
}