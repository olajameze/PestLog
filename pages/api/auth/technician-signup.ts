import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const rawEmail = typeof req.body?.email === 'string' ? req.body.email : '';
  const rawFullName = typeof req.body?.fullName === 'string' ? req.body.fullName : '';

  const email = rawEmail.trim().toLowerCase();
  const fullName = rawFullName.trim();

  if (!validEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }
  const techRecord = await prisma.technician.findFirst({
    where: { email },
    select: { id: true, name: true, companyId: true },
  });
  if (!techRecord) {
    return res.status(403).json({
      error: 'This email is not registered as a technician. Ask your business admin to add you first.',
    });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(500).json({ error: 'Auth service is not configured.' });
  }

  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      role: 'technician',
      fullName: fullName || techRecord.name || '',
      technicianId: techRecord.id,
      companyId: techRecord.companyId,
    },
  });

  if (created.error) {
    if ((created.error.message || '').toLowerCase().includes('already')) {
      return res.status(409).json({
        error: 'This technician account already exists. Please sign in using one-time code.',
      });
    }
    return res.status(400).json({ error: created.error.message || 'Unable to create technician account.' });
  }

  return res.status(200).json({ success: true });
}
