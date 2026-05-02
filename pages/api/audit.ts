import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { getSupabaseAdmin } from '../../lib/supabase-admin';

type ProfileRow = { role?: string | null };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const admin = getSupabaseAdmin();
  if (!admin) {
    return res.status(503).json({ error: 'Audit service is not configured (missing Supabase service role).' });
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<ProfileRow>();

  if (profile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  const { data: rows, error: auditError } = await admin
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (auditError) {
    // Migration might not be applied yet.
    return res.status(200).json([]);
  }

  return res.status(200).json(rows ?? []);
}

