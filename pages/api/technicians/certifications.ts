import { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { supabase } from '../../../lib/supabase';
import { prisma } from '../../../lib/prisma';
import { hasSubscriptionAccess } from '../../../lib/subscriptionAccess';
import { normalizeAuthEmail } from '../../../lib/auth/userSession';
import { technicianEmailWhere } from '../../../lib/auth/technicianGate';

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

    if (error || !user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const technicianId = typeof req.body?.technicianId === 'string' ? req.body.technicianId.trim() : '';
    const fileUrl = typeof req.body?.fileUrl === 'string' ? req.body.fileUrl.trim() : '';
    const expiryDate = typeof req.body?.expiryDate === 'string' ? req.body.expiryDate : undefined;

    if (!technicianId || !fileUrl) {
      return res.status(400).json({ error: 'Missing technicianId or fileUrl' });
    }

    const technician = await prisma.technician.findUnique({
      where: { id: technicianId },
      include: {
        company: {
          select: {
            plan: true,
            subscriptionStatus: true,
            trialEndsAt: true,
            paymentGraceEndsAt: true,
          },
        },
      },
    });

    if (!technician) {
      return res.status(404).json({ error: 'Technician not found' });
    }

    if (!hasSubscriptionAccess(technician.company)) {
      return res.status(403).json({ error: 'Trial expired. Upgrade required to continue using Pest Trace.' });
    }

    const authEmail = normalizeAuthEmail(user.email);
    const ownerCompany = await prisma.company.findUnique({
      where: { email: authEmail },
      select: { id: true },
    });
    const actingTechnician = await prisma.technician.findFirst({
      where: technicianEmailWhere(authEmail),
      select: { id: true, companyId: true },
    });

    const isOwnerForTechnician = Boolean(ownerCompany && ownerCompany.id === technician.companyId);
    const isSelfUpload = Boolean(actingTechnician && actingTechnician.id === technician.id);

    if (!isOwnerForTechnician && !isSelfUpload) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!fileUrl.startsWith(`${technicianId}/`)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    const parsedExpiryDate = expiryDate ? new Date(expiryDate) : null;
    if (parsedExpiryDate && Number.isNaN(parsedExpiryDate.getTime())) {
      return res.status(400).json({ error: 'Invalid expiryDate format' });
    }

    const certification = await prisma.certification.create({
      data: {
        id: randomUUID(),
        technicianId,
        fileUrl,
        expiryDate: parsedExpiryDate,
        uploadedAt: new Date(),
      },
    });

    return res.status(201).json(certification);
  } catch (err) {
    console.error('Certification upload API error:', err);
    return res.status(500).json({ error: 'Certification upload failed', details: String(err) });
  }
}

