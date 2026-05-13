# Super Admin Maintenance (`/super-admin/maintenance`)

This page is reachable only after **Super Admin** sign-in (HTTP-only cookie issued by `POST /api/super-admin/login`, validated with `SUPER_ADMIN_SESSION_SECRET`). It does **not** change the existing `/super-admin` dashboard screen; open maintenance directly or via the “Back to directory” link on the maintenance page.

## What you see

| Section | Purpose |
|--------|---------|
| **System health** | Supabase connectivity (`profiles` probe), `/api/health` latency, `logbook-photos` storage bucket list probe, last `background_job_runs` row (updated after successful Stripe webhook processing). |
| **Database management** | Row counts for `profiles`, `LogbookEntry`, `chemical_logs`, `suggestions`, `deletion_feedback`, `audit_logs`, `offline_queue`. Manual **vacuum** request (may no-op on poolers), **clear offline_queue** (server-side staging table). |
| **Webhook monitoring** | Open rows in `webhook_errors` (failed Stripe handler paths). **Retry reconcile** runs `reconcileCompanyBillingFromStripe` when payload includes `stripeCustomerId`. |
| **Error logs** | Last 10 rows from `error_logs`; **Download JSON** exports up to 2000 rows (`GET /api/super-admin/maintenance/error-log-export`). |
| **Manual actions** | Refresh Stripe → Company billing for all rows with `stripeCustomerId`; purge old rows from `auth.sessions` (requires DB privileges); delete Supabase auth user **by email** (auth only — no Prisma company teardown). |

## APIs

- `GET /api/super-admin/maintenance/snapshot` — JSON snapshot (cookie auth).
- `POST /api/super-admin/maintenance/action` — `{ action: 'vacuum' | 'clear_offline_queue' | 'retry_webhook' | 'refresh_plans' | 'purge_sessions' | 'delete_user_by_email' | 'bootstrap_schema', ... }`.
- `GET /api/super-admin/maintenance/error-log-export` — attachment JSON.

## Bootstrap / missing tables

If counts show **unavailable**, use **Create missing tables** (runs idempotent DDL from `prisma/migrations/20260513120000_maintenance_feedback_tables/migration.sql`) or deploy migrations (`npm run migrate` / `prisma migrate deploy`).

## Common tasks

1. **Stripe/plan drift** — “Refresh all user plans (Stripe)”.  
2. **Webhook missed** — Inspect `webhook_errors`, fix underlying issue, “Retry reconcile”.  
3. **Investigate 500s** — Error logs section + download JSON.  
4. **Clear staging offline rows** — “Clear offline_queue” (browser IndexedDB offline queue is separate; this table is server-side).

## Playwright / simulations

Set `PLAYWRIGHT_MAINTENANCE_MOCK_DB_FAILURE=1` before running tests to force the snapshot’s database section into a failure state (see `TESTING.md`).
