# Testing (Playwright)

## Commands

```bash
npm run e2e                    # all tests in tests/
npx playwright test tests/maintenance.spec.ts
npx playwright test tests/suggestions.spec.ts
npx playwright test tests/account-deletion.spec.ts
```

The config (`playwright.config.ts`) starts `npm run build && npm start` on port **3001** unless `reuseExistingServer` applies (non-CI). The spawned server inherits the parent **`process.env`** (merged with `PORT`, `NODE_ENV=test`, etc.) so Supabase/Stripe keys needed by API routes remain available. Next.js still loads `.env.local` when present. Web server timeout defaults to **420s** to allow production builds.

## Global setup

`playwright-global-setup.ts` runs `npx prisma migrate deploy` so tables such as `suggestions`, `error_logs`, and `deletion_feedback` exist before tests run. If migrate fails (offline DB), DB-heavy tests may fail.

## Environment variables

### Super Admin maintenance tests

| Variable | Purpose |
|----------|---------|
| `SUPER_ADMIN_EMAIL` | Login email |
| `SUPER_ADMIN_PASSWORD` | Login password |
| `SUPER_ADMIN_SESSION_SECRET` | ≥16 chars — cookie signing |

Without these, maintenance tests that require login are **skipped**.

### Maintenance simulation

| Variable | Purpose |
|----------|---------|
| `PLAYWRIGHT_MAINTENANCE_MOCK_DB_FAILURE=1` | Snapshot marks DB metrics failed (error banner). |

### Account deletion UI / destructive E2E

| Variable | Purpose |
|----------|---------|
| `PLAYWRIGHT_OWNER_EMAIL` / `PLAYWRIGHT_OWNER_PASSWORD` | Business owner login for modal visibility test |
| `PLAYWRIGHT_ACCOUNT_DELETE_E2E=1` | Enables **destructive** full-delete test (disposable tenant only) |

## Test database

Use the same Postgres as `.env.local` `DATABASE_URL`, or a dedicated Supabase project. Run migrations before CI:

```bash
npm run migrate
```

## Notes

- Stripe webhook tests live in `tests/stripe-webhook.spec.ts`.
- Legacy smoke: `tests/e2e.spec.ts`.
