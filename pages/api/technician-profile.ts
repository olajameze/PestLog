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
    include: { company: true },
  });

  if (!technician) {
    return res.status(403).json({ error: 'Access denied' });
  }

  return res.status(200).json({
    technician: {
      id: technician.id,
      name: technician.name,
      email: technician.email,
      companyId: technician.companyId,
      companyName: technician.company.name,
    },
  });
}
