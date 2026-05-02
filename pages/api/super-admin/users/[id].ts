import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { getSuperAdminCookieName, verifySuperAdminToken } from '../../../../lib/superAdminAuth';

type ActionBody =
  | { action: 'disable' }
  | { action: 'enable' }
  | { action: 'force_signout' }
  | { action: 'set_role'; role: 'admin' | 'technician' };

function parseBody(body: unknown): ActionBody | null {
  if (!body || typeof body !== 'object') return null;
  const action = (body as { action?: string }).action;
  if (action === 'disable' || action === 'enable' || action === 'force_signout') {
    return { action };
  }
  if (action === 'set_role') {
    const role = (body as { role?: string }).role;
    if (role === 'admin' || role === 'technician') {
      return { action, role };
    }
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = req.cookies[getSuperAdminCookieName()];
  if (!verifySuperAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = typeof req.query.id === 'string' ? req.query.id : '';
  if (!userId) {
    return res.status(400).json({ error: 'User id is required' });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(500).json({ error: 'Supabase admin client not configured' });
  }

  if (req.method === 'DELETE') {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH', 'DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = parseBody(req.body);
  if (!payload) {
    return res.status(400).json({ error: 'Invalid action payload' });
  }

  if (payload.action === 'disable') {
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (payload.action === 'enable') {
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (payload.action === 'force_signout') {
    // Supabase admin SDK does not expose "logout by user id".
    // We use a short temporary ban to invalidate active sessions and force re-authentication.
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: '1h' });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  const roleUpdate = payload;
  const current = await admin.auth.admin.getUserById(userId);
  if (current.error || !current.data?.user) {
    return res.status(500).json({ error: current.error?.message || 'Unable to load user' });
  }
  const nextMetadata = {
    ...(current.data.user.user_metadata ?? {}),
    role: roleUpdate.role,
  };

  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: nextMetadata,
  });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}

