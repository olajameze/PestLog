import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildSetSuperAdminCookie,
  createSuperAdminToken,
  isSuperAdminCredential,
} from '../../../lib/superAdminAuth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const email = typeof req.body?.email === 'string' ? req.body.email : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!isSuperAdminCredential(email, password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = createSuperAdminToken();
  if (!token) {
    return res.status(500).json({ error: 'Super admin auth is not configured on this environment' });
  }

  res.setHeader('Set-Cookie', buildSetSuperAdminCookie(token));
  return res.status(200).json({ ok: true });
}

