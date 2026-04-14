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
      // Get company's technicians
      const company = await prisma.company.findUnique({
        where: { email: user.email },
        include: { technicians: true },
      });
      return res.status(200).json(company?.technicians || []);
    } else if (req.method === 'POST') {
      // Add technician
      const { name, email } = req.body;
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email required' });
      }
      const company = await prisma.company.findUnique({
        where: { email: user.email },
        include: { technicians: true },
      });
      if (!company) {
        return res.status(400).json({ error: 'No company found' });
      }

      // Trial plan limit: max 2 technicians
      if (company.plan === 'trial' && company.technicians.length >= 2) {
        return res.status(403).json({ 
          error: 'Your current plan allows up to 2 technicians. Upgrade to Pro or Business to add more.' 
        });
      }

      const technician = await prisma.technician.create({
        data: {
          name,
          email,
          companyId: company.id,
        },
      });
      return res.status(201).json(technician);
    } else if (req.method === 'DELETE') {
      // Remove technician
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Technician ID required' });
      }
      const company = await prisma.company.findUnique({
        where: { email: user.email },
      });
      if (!company) {
        return res.status(400).json({ error: 'No company found' });
      }
      // Verify technician belongs to company
      const technician = await prisma.technician.findFirst({
        where: { id: id as string, companyId: company.id },
      });
      if (!technician) {
        return res.status(404).json({ error: 'Technician not found' });
      }
      await prisma.technician.delete({
        where: { id: id as string },
      });
      return res.status(200).json({ message: 'Technician removed' });
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (err) {
    return res.status(500).json({ error: 'Technician request failed', details: String(err) });
  }
}