import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { technicianEmailWhere } from '../../lib/auth/technicianGate';
import { normalizeAuthEmail } from '../../lib/auth/userSession';

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
    where: technicianEmailWhere(normalizeAuthEmail(user.email)),
    include: {
      company: {
        select: { name: true, country: true },
      },
    },
  });

  if (!technician) {
    // Authenticated, but no Technician row — normal for business owners. Use 200 so
    // clients can probe role without DevTools “failed request” noise.
    return res.status(200).json({ technician: null });
  }

  return res.status(200).json({
    technician: {
      id: technician.id,
      name: technician.name,
      email: technician.email,
      companyId: technician.companyId,
      companyName: technician.company.name,
      // Used as the authoritative locale source on the technician logbook form,
      // replacing unreliable browser locale/timezone detection.
      companyCountry: technician.company.country ?? null,
    },
  });
}
