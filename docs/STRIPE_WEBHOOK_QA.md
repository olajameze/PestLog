# Stripe checkout and webhook — manual E2E (test mode)

Use this checklist to confirm upgrades update `Company.plan` and unlock gated APIs. **Automated webhook smoke** (no Stripe keys required for this assertion): `npx playwright test tests/stripe-webhook.spec.ts`

## Prerequisites

1. `.env.local` with valid **test** keys:
   - `STRIPE_SECRET_KEY` (`sk_test_…`)
   - `STRIPE_WEBHOOK_SECRET` (`whsec_…` from Stripe CLI or Dashboard webhook)
   - `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_BUSINESS`, `STRIPE_PRICE_ID_ENTERPRISE` (each `price_…`)
   - `DATABASE_URL`, `DIRECT_URL`, Supabase vars (see [`.env.example`](../.env.example))
2. Local app: `npm run dev` (default `http://localhost:3000`).

## Forward webhooks to localhost

In a separate terminal:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the **webhook signing secret** (`whsec_…`) into `STRIPE_WEBHOOK_SECRET` and restart `npm run dev` if you change it.

## Checkout E2E

1. Sign in as a company owner (verified email) with an existing `Company` row.
2. Open `/upgrade`, choose **Pro**, **Business**, or **Enterprise**, complete Stripe Checkout with a [test card](https://docs.stripe.com/testing) (e.g. `4242 4242 4242 4242`).
3. After redirect back to the app, confirm:
   - `GET /api/subscription` returns `status: "active"` and `plan` matching the chosen tier.
   - `Company` in the database: `plan`, `subscriptionStatus`, `stripeCustomerId`, `trialEndsAt` cleared on successful `checkout.session.completed` (see [`pages/api/webhooks/stripe.ts`](../pages/api/webhooks/stripe.ts)).

## Gated feature smoke (optional)

| After purchase | Quick check |
|----------------|-------------|
| Pro+ | Open `/reports` or call `GET /api/reports` with session — should not return trial-expired 403. |
| Business+ | Dashboard: “Customer & retention analytics” should show CLV-related content. |
| Enterprise | Reports **Enterprise performance / NPS** section with owner session during active trial or on Enterprise plan — `POST /api/enterprise/nps` should not return 403 “Enterprise plan required”. |

## Subscription lifecycle

- Use Stripe Customer Portal (`/api/create-portal-session`) to cancel; webhook `customer.subscription.deleted` sets `subscriptionStatus` to `canceled`. Re-verify app behavior for downgraded users if you change cancellation handling.

## CI without Stripe

The Playwright suite asserts **unauthenticated** API behavior and **webhook rejects unsigned payloads** (no live Stripe call required for that test).
