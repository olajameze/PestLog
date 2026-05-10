import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { getSuperAdminCookieName, verifySuperAdminToken } from '../../../lib/superAdminAuth';
import { billingRowsByNormalizedEmail, mergeUserBilling } from '../../../lib/superAdmin/billingForUserEmails';
import type { UserBillingRow } from '../../../lib/superAdmin/billingForUserEmails';

type BaseUser = {
  id: string;
  email: string;
  createdAt: string | null;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  role: string;
  bannedUntil: string | null;
  isProtected: boolean;
};

type SafeUser = BaseUser & UserBillingRow;

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

  const requestedPage = Number(req.query.page ?? 1);
  const requestedPerPage = Number(req.query.perPage ?? 50);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;
  const perPage =
    Number.isFinite(requestedPerPage) && requestedPerPage > 0
      ? Math.min(200, Math.floor(requestedPerPage))
      : 50;

  const { data, error } = await admin.auth.admin.listUsers({
    page,
    perPage,
  });
  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const protectedEmail = (process.env.SUPER_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const baseUsers: BaseUser[] = (data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? '',
    createdAt: u.created_at ?? null,
    lastSignInAt: u.last_sign_in_at ?? null,
    emailConfirmedAt: u.email_confirmed_at ?? null,
    role: typeof u.user_metadata?.role === 'string' ? u.user_metadata.role : 'unknown',
    bannedUntil: u.banned_until ?? null,
    isProtected: protectedEmail.length > 0 && (u.email ?? '').trim().toLowerCase() === protectedEmail,
  }));

  const billingMap = await billingRowsByNormalizedEmail(baseUsers.map((u) => u.email));
  const users: SafeUser[] = baseUsers.map((u) => mergeUserBilling(u, billingMap));

  return res.status(200).json({
    users,
    page: data?.page ?? page,
    perPage: data?.per_page ?? perPage,
    total: data?.total ?? users.length,
  });
}

