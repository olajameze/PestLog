import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { prisma } from '../../../lib/prisma';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const CERT_BUCKET = 'logbook-photos';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const company = await prisma.company.findFirst({
    where: { email: user.email },
  });
  if (!company) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { technicianId, expiryDate, fileUrl } = req.body;

  if (!technicianId || !fileUrl) {
    return res.status(400).json({ error: 'Missing technicianId or fileUrl' });
  }

  const technician = await prisma.technician.findFirst({
    where: { id: technicianId, companyId: company.id },
  });
  if (!technician) {
    return res.status(400).json({ error: 'Invalid technician' });
  }

  if (!fileUrl.startsWith(`${technicianId}/`)) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  const certification = await prisma.certification.create({
    data: {
      technicianId,
      fileUrl,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    },
  });

  return res.status(201).json(certification);
}

