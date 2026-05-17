# Business Admin Technician Access

This document defines when business users can enter the technician workspace from the owner dashboard.

## Eligibility (plan + role gate)

Business users can access the technician reporting flow only when both are true:

- `profiles.role` is `admin` or `manager`
- `profiles.plan` is `pro`, `business`, or `enterprise`

Users on `starter` do not get this access link.

## Navigation behavior

- Eligible users see **Log reports as technician** on the main dashboard (`/dashboard`).
- In the technician workspace (`/technician`), eligible users see **Back to admin dashboard**.

## One-time guidance message

On first eligible dashboard load, PestTrace shows:

`As a business admin, you can also log your own technician reports. Use the 'Log reports as technician' link in your dashboard.`

This is shown once per browser using localStorage key:

- `admin_tech_message_shown = "true"`

## Non-goals / unchanged systems

This feature does **not** change:

- authentication flow
- API routes
- Supabase RLS or schema
- Stripe billing logic
- existing technician report submission logic
