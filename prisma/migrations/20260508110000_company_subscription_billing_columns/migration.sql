-- Company: Stripe subscription period + cancel-at-period-end (checkout, webhooks, reconcile).
-- Safe on databases that already have these columns (IF NOT EXISTS).
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "subscriptionPeriodEndAt" TIMESTAMPTZ(6);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "subscriptionCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
