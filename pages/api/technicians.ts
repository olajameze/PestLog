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
  if (error || !user) {
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
    });
    if (!company) {
      return res.status(400).json({ error: 'No company found' });
    }
    const technician = await prisma.technician.create({
      data: {
        name,
        email,
        companyId: company.id,
      },
    });
    return res.status(201).json(technician);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}