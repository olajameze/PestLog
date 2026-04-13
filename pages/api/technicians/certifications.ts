import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { prisma } from '../../../lib/prisma';

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
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const company = await prisma.company.findFirst({
    where: { email: user.email },
  });
  if (!company) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { technicianId, expiryDate, file } = req.body;

  if (!technicianId || !file) {
    return res.status(400).json({ error: 'Missing technicianId or file' });
  }

  const technician = await prisma.technician.findFirst({
    where: { id: technicianId, companyId: company.id },
  });
  if (!technician) {
    return res.status(400).json({ error: 'Invalid technician' });
  }

  // Parse base64 file
  const base64Data = file.replace(/^data:([A-Za-z-+/]+);base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  const fileName = `cert-${technicianId}-${Date.now()}.${file.split(';')[0].split('/')[1]}`;
  const filePath = `${technicianId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(CERT_BUCKET)
    .upload(filePath, buffer, {
      upsert: false,
    });

  if (uploadError) {
    return res.status(500).json({ error: 'File upload failed', details: uploadError.message });
  }

  const certification = await prisma.certification.create({
    data: {
      technicianId,
      fileUrl: filePath,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    },
  });

  return res.status(201).json(certification);
}

