## Improvements implemented

### Critical
- Offline logbook entry queueing via IndexedDB (`lib/offline/db.ts`) and replay via `pages/api/offline/sync.ts`.
- Dashboard logbook form now saves offline (queues write + optimistic UI) and syncs when reconnected.
- Lint/TS build blockers fixed (dashboard error boundary close tag; reports parsing).

### Important
- RBAC primitives added: `lib/rbac/roles.ts`, `hooks/usePermissions.ts` (reads `profiles.role` and `profiles.plan`).
- Audit trail primitives added: best-effort insert (`lib/audit/log.ts`) and admin-only viewer API (`pages/api/audit.ts`).
- Global search endpoint added: `pages/api/search.ts` (company-scoped logbook search).
- Server export endpoints added:
  - `pages/api/export/csv.ts`
  - `pages/api/export/pdf.ts`
- Stripe webhook normalized: `/api/stripe-webhook` now aliases the canonical handler at `pages/api/webhooks/stripe.ts`.
- Health endpoint added: `GET /api/health` for Supabase/DB/Stripe env & connectivity checks.

## Testing checklist

### Offline logbook
1. Open `/dashboard?tab=logbook`
2. DevTools → Network → Offline
3. Save a logbook entry (no photos)
4. Confirm: success toast + entry appears immediately
5. DevTools → Network → Online
6. Confirm: Offline banner shows syncing then clears; entry exists in DB

### Audit logs
1. Apply the Supabase migration for `audit_logs`
2. Create a logbook entry
3. Call `GET /api/audit` with an admin user token
4. Confirm: audit entry exists

