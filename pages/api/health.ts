import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { supabaseAdmin } from '../../lib/supabase-admin';
import { prisma } from '../../lib/prisma';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  try {
    const urlOk = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const anonOk = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const serviceOk = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
    checks.supabase_env = { ok: urlOk && anonOk && serviceOk };
    if (!checks.supabase_env.ok) checks.supabase_env.detail = 'Missing one of SUPABASE env vars';
  } catch (e) {
    checks.supabase_env = { ok: false, detail: String(e) };
  }

  try {
    // Smoke: call a lightweight auth endpoint (doesn't require user session).
    // This will fail if the URL/key are invalid.
    const { error } = await supabase.auth.getSession();
    checks.supabase_client = { ok: !error, detail: error ? error.message : undefined };
  } catch (e) {
    checks.supabase_client = { ok: false, detail: String(e) };
  }

  try {
    // Service role check (will throw at import if env missing).
    const { error } = await supabaseAdmin.from('profiles').select('id').limit(1);
    checks.supabase_service_role = { ok: !error, detail: error ? error.message : undefined };
  } catch (e) {
    checks.supabase_service_role = { ok: false, detail: String(e) };
  }

  try {
    await prisma.company.findFirst({ select: { id: true } });
    checks.prisma_db = { ok: true };
  } catch (e) {
    checks.prisma_db = { ok: false, detail: String(e) };
  }

  checks.stripe_env = {
    ok: Boolean(process.env.STRIPE_SECRET_KEY) && Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    detail: !process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET ? 'Missing STRIPE env vars' : undefined,
  };

  const ok = Object.values(checks).every((c) => c.ok);
  return res.status(ok ? 200 : 500).json({ ok, checks });
}
