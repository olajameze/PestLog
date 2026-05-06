import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { prisma } from '../../../lib/prisma';
import { sendTechnicianInviteEmail } from '../../../lib/email';
import { normalizeAuthEmail } from '../../../lib/auth/userSession';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const ownerEmail = normalizeAuthEmail(user.email);

  const company = await prisma.company.findUnique({
    where: { email: ownerEmail },
    select: { id: true, name: true },
  });

  if (!company) {
    const technician = await prisma.technician.findFirst({
      where: { email: ownerEmail },
      select: { id: true },
    });
    if (technician) {
      return res.status(403).json({
        error: 'Technician accounts cannot send invites.',
        code: 'ROLE_TECHNICIAN',
      });
    }
    return res.status(404).json({ error: 'Company not found' });
  }

  const rawTechnicianId = req.body?.technicianId;
  if (typeof rawTechnicianId !== 'string' || !rawTechnicianId.trim()) {
    return res.status(400).json({ error: 'Technician ID is required' });
  }

  const technician = await prisma.technician.findFirst({
    where: { id: rawTechnicianId, companyId: company.id },
    select: { id: true, name: true, email: true },
  });

  if (!technician) {
    return res.status(404).json({ error: 'Technician not found for this company' });
  }

  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';
  const recipientEmail = normalizeAuthEmail(technician.email);
  const inviteLink = `${appUrl}/auth/signup?role=technician&email=${encodeURIComponent(
    recipientEmail,
  )}`;

  try {
    const sendResult = await sendTechnicianInviteEmail({
      email: recipientEmail,
      technicianName: technician.name,
      companyName: company.name || undefined,
      inviteLink,
    });
    return res.status(200).json({
      success: true,
      inviteLink,
      resendId: sendResult?.id,
    });
  } catch (sendError) {
    console.error('Technician invite email failed:', sendError);
    return res.status(200).json({
      success: false,
      warning:
        'Invite email service is unavailable. Share the invite link manually with the technician.',
      inviteLink,
    });
  }
}

