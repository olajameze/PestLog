import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { prisma } from '../../../lib/prisma';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};


// const CERT_BUCKET = 'logbook-photos'; // unused


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
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

    const { technicianId, expiryDate, fileUrl } = req.body;

    if (!technicianId || !fileUrl) {
      return res.status(400).json({ error: 'Missing technicianId or fileUrl' });
    }

    const technician = await prisma.technician.findUnique({
      where: { id: technicianId },
      include: { company: true },
    });

    if (!technician || technician.company.email !== user.email) {
      return res.status(403).json({ error: 'Forbidden' });
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
  } catch (err) {
    console.error('Certification upload API error:', err);
    return res.status(500).json({ error: 'Certification upload failed', details: String(err) });
  }
}

