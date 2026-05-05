import type { NextApiRequest, NextApiResponse } from 'next';
import { TECHNICIAN_EMAIL_NOT_ON_ROSTER } from '../../../lib/auth/technicianGate';
import { prisma } from '../../../lib/prisma';

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Called before technician OTP sign-in. Ensures no Supabase OTP email is sent
 * unless this email exists on a business's technician roster.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawEmail = typeof req.body?.email === 'string' ? req.body.email : '';
  const email = rawEmail.trim().toLowerCase();

  if (!validEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  const techRecord = await prisma.technician.findFirst({
    where: { email },
    select: { id: true },
  });

  if (!techRecord) {
    return res.status(403).json({ error: TECHNICIAN_EMAIL_NOT_ON_ROSTER });
  }

  return res.status(200).json({ ok: true });
}
