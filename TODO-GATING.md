# PestTrek Plan-Based Feature Gating

Progress: backend documented QA procedure + webhook smoke test

## Backend (implemented)

### 1. Prisma schema
- [x] `Company.plan` — `String? @default("trial")` in `prisma/schema.prisma`
- [x] Run `npx prisma migrate dev` or `npx prisma db push` after schema changes; then `npx prisma generate`

### 2. `lib/planGuard.ts`
- [x] `checkPlan(companyPlan: string | null, allowedPlans: string[]): boolean`

### 3. `pages/api/create-checkout-session.ts`
- [x] `client_reference_id: \`${company.id}:${selectedPlan}\``

### 4. `pages/api/webhooks/stripe.ts`
- [x] Parse `client_reference_id` → company id + plan; update `prisma.company`

### 5. API / UI usage
- [x] Plan checks in `pages/api/reports.ts`, certifications routes, `pages/dashboard.tsx`, etc.
- [x] **Checkout + webhook QA:** Step-by-step test mode runbook in [`docs/STRIPE_WEBHOOK_QA.md`](docs/STRIPE_WEBHOOK_QA.md). Automated smoke: `npx playwright test tests/stripe-webhook.spec.ts` (rejects unsigned webhook payloads). Complete a real Checkout once per release using that doc.

## Frontend gating

- [x] `dashboard.tsx` uses `checkPlan` for feature visibility (alongside subscription status where applicable)

**Rule:** Prefer conditional logic only; avoid unrelated layout churn when extending gating.

## Database & Prisma (Supabase)

- Set **`DATABASE_URL`** (pooled, `:6543`, `pgbouncer=true` where applicable) for the app; **`DIRECT_URL`** (direct `:5432`) for **`npx prisma db push`** / migrate — avoids PgBouncer prepared-statement errors.
- See [`.env.example`](.env.example) and `prisma.config.ts`.

## Customer-facing tiers

- **[`docs/TIER_MATRIX.md`](docs/TIER_MATRIX.md)** — Pro / Business / Enterprise vs features for support and sales.
