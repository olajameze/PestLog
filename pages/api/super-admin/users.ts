import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { getSuperAdminCookieName, verifySuperAdminToken } from '../../../lib/superAdminAuth';

type SafeUser = {
  id: string;
  email: string;
  createdAt: string | null;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  role: string;
  bannedUntil: string | null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.cookies[getSuperAdminCookieName()];
  if (!verifySuperAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(500).json({ error: 'Supabase admin client not configured' });
  }

  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const users: SafeUser[] = (data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? '',
    createdAt: u.created_at ?? null,
    lastSignInAt: u.last_sign_in_at ?? null,
    emailConfirmedAt: u.email_confirmed_at ?? null,
    role: typeof u.user_metadata?.role === 'string' ? u.user_metadata.role : 'unknown',
    bannedUntil: u.banned_until ?? null,
  }));

  return res.status(200).json({ users });
}

