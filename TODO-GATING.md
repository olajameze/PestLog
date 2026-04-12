# PestTrek Plan-Based Feature Gating

Progress: backend ✅ · ongoing QA for Stripe flows

## Backend (implemented)

### 1. Prisma schema
- [x] `Company.plan` — `String? @default("trial")` in `prisma/schema.prisma`
- [x] Run `npx prisma migrate dev` or `npx prisma db push` after schema changes; then `npx prisma generate`

### 2. `lib/planGuard.ts`
- [x] `checkPlan(companyPlan: string | null, allowedPlans: string[]): boolean`

### 3. `pages/api/create-checkout-session.ts`
- [x] `client_reference_id: \`${company.id}:${selectedPlan}\``

### 4. `pages/api/stripe-webhook.ts`
- [x] Parse `client_reference_id` → company id + plan; update `prisma.company`

### 5. API / UI usage
- [x] Plan checks in `pages/api/reports.ts`, certifications routes, `pages/dashboard.tsx`, etc.
- [ ] Manual: test checkout + webhook (Stripe test mode / ngrok as needed)

## Frontend gating

- [x] `dashboard.tsx` uses `checkPlan` for feature visibility (alongside subscription status where applicable)

**Rule:** Prefer conditional logic only; avoid unrelated layout churn when extending gating.

## Database & Prisma (Supabase)

- Set **`POSTGRES_PRISMA_URL`** (pooled, `:6543`) for the app; **`POSTGRES_URL_NON_POOLING`** (session `:5432`, from Supabase Connect) for **`npx prisma db push`** / migrate — avoids PgBouncer prepared-statement errors.
- See **`.env.example`** and `prisma.config.ts`.
