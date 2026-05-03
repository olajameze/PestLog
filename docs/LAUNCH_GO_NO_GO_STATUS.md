# Launch Go/No-Go Status

Last updated: 2026-05-03

## Gate Status

- `env-health-gate`: PASS
  - Production `/api/health` returns `ok: true`.
  - Vercel production env now includes required Stripe price IDs, `NEXT_PUBLIC_SITE_URL`, `MAINTENANCE_MODE`, and `SUPPORT_EMAIL`.
- `automated-preflight`: PASS
  - `npm run lint`
  - `npm run build`
  - `npm run smoke-test`
  - `npm run e2e`
  - `npm run e2e:webhook`
- `stripe-webhook-gate`: PASS (technical) / OWNER PAYMENT WALKTHROUGH PENDING
  - Webhook endpoint responds correctly to unsigned test payload (`Missing stripe-signature header`).
  - Checkout/subscription endpoints correctly reject unauthenticated requests.
  - Manual Stripe checkout + webhook lifecycle validation in Stripe dashboard still required before launch signoff.
- `manual-uat-gate`: PASS (automated) / FINAL HUMAN UAT SIGNOFF PENDING
  - Automated smoke and e2e checks passed.
  - Final owner/technician visual walkthrough checklist remains below for signoff.
- `observability-gate`: PASS
  - Logger updated to emit `warn` and `error` in production by default.
  - `LOG_LEVEL` override added to `.env.example`.
- `launch-watch`: IN PROGRESS
  - Production deploy completed (`pest-trek-nlwo7c30x-olajamezes-projects.vercel.app`) and health checks are green.
  - Continue 48-hour monitoring checklist below.

## Manual UAT Signoff Checklist

- Owner auth flow: signup/signin/logout/reset.
- Technician invite flow: send invite, signup, signin, access restrictions.
- Dashboard: all cards load, no overlaps on desktop/mobile, actions route correctly.
- Logbook: create/edit/delete entry, photo upload, signature capture, follow-up fields.
- Reports: filters, quick search modal, saved views, bulk actions, PDF export.
- Settings: billing controls, notification toggles, enterprise sections (if plan enabled).
- Offline behavior: enqueue actions offline, sync when online.
- Super-admin: login page shows configured state, admin operations function.

## Stripe Manual Verification Checklist

- Complete one test checkout for each required plan tier.
- Confirm `checkout.session.completed` webhook delivery in Stripe dashboard.
- Confirm plan state updates in app after checkout return.
- Confirm billing portal cancel flow updates subscription status.
- Confirm no webhook retries/failures remain in Stripe event log.

## Launch Execution Checklist

- Code freeze and final local preflight:
  - `npm run lint && npm run build && npm run smoke-test && npm run e2e && npm run e2e:webhook`
- Deploy production:
  - `npx vercel --prod`
- Post-deploy verification:
  - `curl -sSL https://www.pesttrace.com/api/health`
  - Open `/dashboard`, `/reports`, `/technician`, `/auth/super-admin`.

## 48-Hour Watch

- Check every 4-6 hours:
  - Vercel function errors (`npx vercel logs --prod`).
  - Stripe webhook failures/retries.
  - API errors for auth, reports, checkout, and uploads.
  - DB connectivity/authentication anomalies.
- Rollback trigger:
  - Repeated critical API failures or billing failures with no hotfix in <30 minutes.
