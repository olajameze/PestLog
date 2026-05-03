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

## OTP / 2FA Auth Readiness

- Technician auth now uses OTP-only sign-in (`/auth/signin?role=technician`), with password login disabled for technician flow.
- Business admin signup now requires OTP verification before registration is considered complete; normal admin signin remains password-based.
- Supabase Auth SMTP must be configured to Resend for OTP delivery to work in production.
- QA checklist:
  - Technician: send code, resend cooldown, verify valid code, reject invalid/expired code.
  - Admin signup: create account, receive OTP, verify OTP, confirm redirect to `/dashboard`.
  - Admin signin: confirm normal password login still works without recurring OTP prompt.

## Billing Grace Policy Readiness

- New non-payment policy implemented from Stripe webhook events:
  - Grace window begins on `invoice.payment_failed` and lasts 5 days.
  - Access remains available during grace.
  - If unresolved after grace, subscription is canceled and a one-time 7-day retrial is granted.
  - After retrial is used, future missed-payment cancellations do not receive another retrial.
- Recovery behavior:
  - `invoice.paid` and active subscription recovery clear grace metadata.
- Validation completed:
  - `npm run lint`
  - `npm run build`
  - `npm run smoke-test`

## Plan Entitlements Alignment

- Plan technician allowances are now aligned across pricing UI and backend enforcement:
  - Pro (`£25/month`): up to 3 technicians
  - Business (`£40/month`): up to 10 technicians
  - Enterprise: unlimited technicians
- Backend enforcement now uses a centralized plan-limit policy utility and applies caps in `POST /api/technicians`.
- Dashboard technician management now shows live usage versus plan allowance and explicit upgrade guidance when limits are reached.

## Follow-up Ops Status

- Production redeploy completed:
  - `https://pest-trek-qleu4x2an-olajamezes-projects.vercel.app` (aliased to `https://www.pesttrace.com`)
- Post-deploy health check:
  - `curl https://www.pesttrace.com/api/health` returned `ok: true` with Stripe/Supabase/Prisma checks passing.
- DB sync script execution:
  - Attempted with `npx prisma db execute --file "prisma/sql/sync_company_columns.sql"`.
  - Blocked in this environment by DB connectivity (`P1001` then `P1017`), so SQL application must be run from a network context that can reach the configured Supabase host.
- Stripe webhook verification:
  - Automated `npm run e2e:webhook` timed out waiting for Playwright web server startup in this environment.
  - Direct Stripe CLI trigger attempt (`stripe trigger invoice.payment_failed`) failed due expired Stripe test API key (`api_key_expired`).
  - Manual Stripe test-mode verification checklist remains required in `docs/STRIPE_WEBHOOK_QA.md` for final signoff of `invoice.payment_failed` and `invoice.paid` lifecycle.
