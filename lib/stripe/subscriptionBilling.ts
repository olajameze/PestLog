import type Stripe from 'stripe';

/** Stripe REST uses snake_case; keep a narrow bridge for Prisma/Typedoc drift across Stripe SDK versions. */
export function stripeSubscriptionBillingSnapshot(sub: Stripe.Subscription): {
  periodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
} {
  const o = sub as unknown as {
    current_period_end?: number;
    cancel_at_period_end?: boolean;
  };
  const periodEnd =
    typeof o.current_period_end === 'number' ? new Date(o.current_period_end * 1000) : null;
  return {
    periodEnd,
    cancelAtPeriodEnd: Boolean(o.cancel_at_period_end),
  };
}
