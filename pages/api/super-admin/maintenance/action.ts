import type { NextApiRequest, NextApiResponse } from 'next';
import { readFileSync } from 'fs';
import { join } from 'path';
import { prisma } from '../../../../lib/prisma';
import { getSupabaseAdmin } from '../../../../lib/supabase-admin';
import { getSuperAdminCookieName, verifySuperAdminToken } from '../../../../lib/superAdminAuth';
import { reconcileCompanyBillingFromStripe } from '../../../../lib/stripe/reconcileCompanyBilling';
import { logServerExceptionToDb } from '../../../../lib/server/errorLogger';

type ActionBody =
  | { action: 'vacuum' }
  | { action: 'clear_offline_queue' }
  | { action: 'retry_webhook'; id: string }
  | { action: 'refresh_plans' }
  | { action: 'purge_sessions' }
  | { action: 'delete_user_by_email'; email: string }
  | { action: 'bootstrap_schema' };

function parseBody(body: unknown): ActionBody | null {
  if (!body || typeof body !== 'object') return null;
  const action = (body as { action?: string }).action;
  if (action === 'vacuum') return { action: 'vacuum' };
  if (action === 'clear_offline_queue') return { action: 'clear_offline_queue' };
  if (action === 'refresh_plans') return { action: 'refresh_plans' };
  if (action === 'purge_sessions') return { action: 'purge_sessions' };
  if (action === 'bootstrap_schema') return { action: 'bootstrap_schema' };
  if (action === 'retry_webhook') {
    const id = (body as { id?: string }).id;
    if (id && typeof id === 'string') return { action: 'retry_webhook', id };
  }
  if (action === 'delete_user_by_email') {
    const email = (body as { email?: string }).email;
    if (email && typeof email === 'string') return { action: 'delete_user_by_email', email };
  }
  return null;
}

async function findAuthUserIdByEmail(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, email: string) {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const users = data?.users ?? [];
    const hit = users.find((u) => (u.email ?? '').trim().toLowerCase() === normalized);
    if (hit) return hit.id;
    if (users.length < perPage) break;
    page += 1;
    if (page > 50) break;
  }
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.cookies[getSuperAdminCookieName()];
  if (!verifySuperAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const payload = parseBody(req.body);
  if (!payload) {
    return res.status(400).json({ error: 'Invalid action payload' });
  }

  const admin = getSupabaseAdmin();
  if (!admin && payload.action !== 'bootstrap_schema') {
    return res.status(503).json({
      error: 'Supabase admin is not configured. Check logs and environment variables.',
    });
  }

  try {
    switch (payload.action) {
      case 'vacuum': {
        try {
          await prisma.$executeRawUnsafe('VACUUM ANALYZE');
          return res.status(200).json({
            ok: true,
            message: 'VACUUM ANALYZE completed.',
          });
        } catch (e) {
          await logServerExceptionToDb(
            'Manual vacuum failed',
            e instanceof Error ? e.stack : undefined,
            {},
          );
          const msg = e instanceof Error ? e.message : String(e);
          return res.status(200).json({
            ok: true,
            message:
              'Vacuum request was processed; some hosted poolers block VACUUM. If counts look stale, run ANALYZE from a direct DB session.',
            detail: msg,
          });
        }
      }

      case 'clear_offline_queue': {
        const result = await prisma.offlineQueueRow.deleteMany({});
        return res.status(200).json({
          ok: true,
          message: `Removed ${result.count} offline_queue row(s).`,
        });
      }

      case 'retry_webhook': {
        const row = await prisma.webhookError.findUnique({ where: { id: payload.id } });
        if (!row) {
          return res.status(404).json({ error: 'Webhook error row not found.' });
        }
        const payloadJson = (row.payload ?? {}) as { stripeCustomerId?: string };
        const customerId = payloadJson.stripeCustomerId;
        if (!customerId || typeof customerId !== 'string') {
          return res.status(400).json({
            error: 'Could not find Stripe customer id on this failure record; reconcile manually in Stripe.',
          });
        }
        const company = await prisma.company.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        });
        if (!company) {
          return res.status(404).json({ error: 'No company matched this Stripe customer id.' });
        }
        await reconcileCompanyBillingFromStripe(company.id);
        await prisma.webhookError.update({
          where: { id: row.id },
          data: { retriedAt: new Date() },
        });
        return res.status(200).json({ ok: true, message: 'Reconciled billing from Stripe for linked company.' });
      }

      case 'refresh_plans': {
        const rows = await prisma.company.findMany({
          where: { stripeCustomerId: { not: null } },
          select: { id: true },
        });
        let ok = 0;
        for (const r of rows) {
          try {
            await reconcileCompanyBillingFromStripe(r.id);
            ok += 1;
          } catch {
            /* continue */
          }
        }
        return res.status(200).json({
          ok: true,
          message: `Refreshed Stripe-derived billing for ${ok} / ${rows.length} companies with a Stripe customer id.`,
        });
      }

      case 'purge_sessions': {
        try {
          const deleted = await prisma.$executeRawUnsafe(`
            DELETE FROM auth.sessions
            WHERE refreshed_at IS NOT NULL
              AND refreshed_at < NOW() - INTERVAL '90 days'
          `);
          return res.status(200).json({
            ok: true,
            message: 'Purged stale auth sessions older than 90 days.',
            deleted,
          });
        } catch (e) {
          await logServerExceptionToDb(
            'Purge sessions failed',
            e instanceof Error ? e.stack : undefined,
            {},
          );
          return res.status(503).json({
            error:
              'Unable to purge sessions from this database role. Run the SQL cleanup in Supabase SQL Editor or use a direct Postgres connection.',
            detail: e instanceof Error ? e.message : String(e),
          });
        }
      }

      case 'delete_user_by_email': {
        const protectedEmail = (process.env.SUPER_ADMIN_EMAIL ?? '').trim().toLowerCase();
        const target = payload.email.trim().toLowerCase();
        if (!target.includes('@')) {
          return res.status(400).json({ error: 'Enter a valid email address.' });
        }
        if (protectedEmail && target === protectedEmail) {
          return res.status(403).json({ error: 'Protected super admin account cannot be deleted.' });
        }
        const userId = await findAuthUserIdByEmail(admin!, payload.email);
        if (!userId) {
          return res.status(404).json({ error: 'No Supabase auth user found with that email.' });
        }
        const { error } = await admin!.auth.admin.deleteUser(userId);
        if (error) {
          await logServerExceptionToDb('Super-admin delete user failed', undefined, { email: target });
          return res.status(500).json({
            error: 'Unable to delete account — check Supabase logs or try again.',
            detail: error.message,
          });
        }
        return res.status(200).json({ ok: true, message: 'Auth user deleted.' });
      }

      case 'bootstrap_schema': {
        const migrationPath = join(
          process.cwd(),
          'prisma/migrations/20260513120000_maintenance_feedback_tables/migration.sql',
        );
        const sql = readFileSync(migrationPath, 'utf8');
        const statements = sql
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.startsWith('--'));
        for (const stmt of statements) {
          await prisma.$executeRawUnsafe(stmt);
        }
        return res.status(200).json({
          ok: true,
          message: 'Applied maintenance DDL (idempotent). Refresh the maintenance page.',
        });
      }

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (e) {
    await logServerExceptionToDb(
      'Maintenance action failed',
      e instanceof Error ? e.stack : undefined,
      { action: payload.action },
    );
    return res.status(500).json({
      error: 'That maintenance action failed — please try again or check error logs.',
      detail: e instanceof Error ? e.message : String(e),
    });
  }
}
