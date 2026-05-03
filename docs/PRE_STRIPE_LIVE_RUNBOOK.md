# Pre–Stripe live and post-launch runbook

Use this alongside [`docs/LAUNCH_GO_NO_GO_STATUS.md`](LAUNCH_GO_NO_GO_STATUS.md). **Automated checks** can be run anytime; **Stripe live cutover** and **48-hour watch** require the product owner.

## Automated checks (developer/CI)

From the repo root:

```bash
npm run lint && npm run build && npm run smoke-test && npm run e2e && npm run e2e:webhook
```

**Production URL smoke** (no auth; checks public pages and `/api/health` JSON):

```bash
BASE_URL=https://www.pesttrace.com npm run smoke:production
```

**Light concurrent load** on `/api/health` (tune `CONCURRENCY` / `ROUNDS`):

```bash
BASE_URL=https://www.pesttrace.com CONCURRENCY=40 ROUNDS=5 npm run load:health
```

Review printed **p95 latency** and ensure **zero failures**. This does not replace formal load testing for very high traffic.

## Phase: Manual staging / production smoke (authenticated)

With a **test** Stripe account and real owner session:

1. Sign in as owner; open **Dashboard**, **Reports**, **Logbook**; confirm no persistent spinners or console errors.
2. Perform one **logbook** write and one **reports** load with filters.
3. `GET /api/subscription` from the browser network tab should match expectations for the account.

**Parallel sessions:** open **3–5 browsers** (or profiles) with different users; repeat read-heavy actions to confirm no cross-account data leakage and acceptable responsiveness.

## Phase: Stripe test-mode rehearsal (owner)

Before switching to live keys:

1. Complete **one test checkout** per sellable tier (or your minimum set).
2. In the Stripe Dashboard, confirm **webhook delivery** for `checkout.session.completed` (and related events) succeeds.
3. Confirm **`Company.plan`** and subscription fields in the database match the purchase after redirect and webhooks.
4. Open **billing portal**, exercise **cancel** or plan change; confirm webhook log has no stuck failures/retries.

See **Stripe Manual Verification Checklist** in [`docs/LAUNCH_GO_NO_GO_STATUS.md`](LAUNCH_GO_NO_GO_STATUS.md).

## Phase: Go-live cutover (owner)

1. In **Stripe**, switch to **live** mode; copy **live** API keys, **live** price IDs, and create/configure the **live** webhook endpoint pointing at production `POST /api/webhooks/stripe` (or your canonical webhook route).
2. In **Vercel** (or host env), set:
   - `STRIPE_SECRET_KEY` (live)
   - `STRIPE_WEBHOOK_SECRET` (live endpoint signing secret)
   - `STRIPE_PRICE_ID_*` (live prices)
   - Any `NEXT_PUBLIC_*` that must match production Stripe/products
3. **Redeploy** production after env changes.
4. Run `BASE_URL=https://your-domain npm run smoke:production` and confirm `/api/health` still reports `stripe_env` ok.
5. Complete **one small live-card purchase** (or internal org) and confirm webhook + plan update.

## Phase: 24–48 hour watch (owner/on-call)

Follow **48-Hour Watch** in [`docs/LAUNCH_GO_NO_GO_STATUS.md`](LAUNCH_GO_NO_GO_STATUS.md):

- Vercel function errors and duration spikes
- Stripe webhook failures
- Auth / DB anomalies

Document date/time of cutover and who is on-call.

---

_Last automated developer run should record: `lint`, `build`, `smoke-test`, `e2e`, `e2e:webhook`, `smoke:production`, and optionally `load:health`._
