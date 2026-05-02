import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';
import { getSuperAdminCookieName, verifySuperAdminToken } from '../../../lib/superAdminAuth';

type AuditRow = {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: unknown;
  new_values: unknown;
  created_at: string;
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

  const userId = typeof req.query.userId === 'string' ? req.query.userId : '';
  if (!userId) {
    return res.status(400).json({ error: 'userId query param is required' });
  }

  const requestedLimit = Number(req.query.limit ?? 10);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(50, Math.floor(requestedLimit)) : 10;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(500).json({ error: 'Supabase admin client not configured' });
  }

  const { data, error } = await admin
    .from('audit_logs')
    .select('id, action, table_name, record_id, old_values, new_values, created_at')
    .eq('table_name', 'auth.users')
    .eq('record_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ rows: (data ?? []) as AuditRow[] });
}

