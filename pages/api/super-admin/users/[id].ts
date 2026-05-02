import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { getSuperAdminCookieName, verifySuperAdminToken } from '../../../../lib/superAdminAuth';
import { writeAuditLog } from '../../../../lib/audit/log';

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

  const currentUser = await admin.auth.admin.getUserById(userId);
  if (currentUser.error || !currentUser.data?.user) {
    return res.status(404).json({ error: currentUser.error?.message || 'User not found' });
  }

  const protectedEmail = (process.env.SUPER_ADMIN_EMAIL ?? '').trim().toLowerCase();
  const isProtectedUser =
    protectedEmail.length > 0 &&
    (currentUser.data.user.email ?? '').trim().toLowerCase() === protectedEmail;
  const requesterId = `super_admin:${protectedEmail || 'operator'}`;
  const ipAddress = (req.headers['x-forwarded-for'] as string | undefined) ?? req.socket.remoteAddress ?? null;

  if (req.method === 'DELETE') {
    if (isProtectedUser) {
      return res.status(403).json({ error: 'Protected super admin account cannot be deleted.' });
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return res.status(500).json({ error: error.message });
    await writeAuditLog({
      userId: requesterId,
      action: 'DELETE',
      tableName: 'auth.users',
      recordId: userId,
      oldValues: {
        email: currentUser.data.user.email ?? '',
        role: currentUser.data.user.user_metadata?.role ?? 'unknown',
      },
      ipAddress,
    });
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
    if (isProtectedUser) {
      return res.status(403).json({ error: 'Protected super admin account cannot be disabled.' });
    }
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
    if (error) return res.status(500).json({ error: error.message });
    await writeAuditLog({
      userId: requesterId,
      action: 'UPDATE',
      tableName: 'auth.users',
      recordId: userId,
      oldValues: { bannedUntil: currentUser.data.user.banned_until ?? null },
      newValues: { bannedUntil: '876000h', action: 'disable' },
      ipAddress,
    });
    return res.status(200).json({ ok: true });
  }

  if (payload.action === 'enable') {
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
    if (error) return res.status(500).json({ error: error.message });
    await writeAuditLog({
      userId: requesterId,
      action: 'UPDATE',
      tableName: 'auth.users',
      recordId: userId,
      oldValues: { bannedUntil: currentUser.data.user.banned_until ?? null },
      newValues: { bannedUntil: null, action: 'enable' },
      ipAddress,
    });
    return res.status(200).json({ ok: true });
  }

  if (payload.action === 'force_signout') {
    if (isProtectedUser) {
      return res.status(403).json({ error: 'Protected super admin account cannot be force-signed out.' });
    }
    // Supabase admin SDK does not expose "logout by user id".
    // We use a short temporary ban to invalidate active sessions and force re-authentication.
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: '1h' });
    if (error) return res.status(500).json({ error: error.message });
    await writeAuditLog({
      userId: requesterId,
      action: 'UPDATE',
      tableName: 'auth.users',
      recordId: userId,
      oldValues: { bannedUntil: currentUser.data.user.banned_until ?? null },
      newValues: { bannedUntil: '1h', action: 'force_signout' },
      ipAddress,
    });
    return res.status(200).json({ ok: true });
  }

  const roleUpdate = payload;
  if (isProtectedUser && roleUpdate.role !== 'admin') {
    return res.status(403).json({ error: 'Protected super admin account role cannot be changed.' });
  }
  const nextMetadata = {
    ...(currentUser.data.user.user_metadata ?? {}),
    role: roleUpdate.role,
  };

  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: nextMetadata,
  });
  if (error) return res.status(500).json({ error: error.message });
  await writeAuditLog({
    userId: requesterId,
    action: 'UPDATE',
    tableName: 'auth.users',
    recordId: userId,
    oldValues: { role: currentUser.data.user.user_metadata?.role ?? 'unknown' },
    newValues: { role: roleUpdate.role, action: 'set_role' },
    ipAddress,
  });
  return res.status(200).json({ ok: true });
}

