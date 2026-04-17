# Plan Gating

Plan gating is implemented for the new dashboard analytics components.

## How it works

The new components use `useUserPlan()` from `lib/auth/plan.ts`.

- `business` plan grants access to the **Customer Lifetime Value** card.
- `enterprise` plan grants access to **Customer Lifetime Value**, **Retention & Churn**, and **CSAT/NPS**.
- Other plans see an upgrade prompt in the analytics section.

## Testing different plans

The hook returns the current company plan if set, otherwise it defaults to `enterprise` in development.

To test plan behavior:

1. Update the mock company plan in `pages/dashboard.tsx` if needed.
2. Use the `tab` query or app UI to navigate to the dashboard.
3. Confirm that:
   - `business` shows only CLV analytics.
   - `enterprise` shows CLV, retention, and CSAT analytics.
   - Trial or `pro` plans show the locked analytics prompt.
