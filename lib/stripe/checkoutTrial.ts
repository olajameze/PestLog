/** Minimum lead time before trial_end (Stripe rejects timestamps too close to "now"). */
export const MIN_TRIAL_END_LEAD_MS = 60 * 60 * 1000;

export type CheckoutTrialAlignment = {
  /** Unix seconds for Stripe subscription_data.trial_end, or null for immediate billing. */
  trialEndUnix: number | null;
  /** True when first charge should wait until trialEndsAt. */
  shouldDeferFirstCharge: boolean;
  /** Parsed trial end date when deferring. */
  trialEndsAt: Date | null;
};

function parseTrialEndsAt(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  const ms = parsed.getTime();
  return Number.isNaN(ms) ? null : parsed;
}

/**
 * Aligns Stripe Checkout subscription trial_end with the app-managed Company.trialEndsAt.
 * Stripe Price objects must not define their own trial period (avoid double trial).
 */
export function resolveCheckoutTrialAlignment(
  trialEndsAt: Date | string | null | undefined,
  nowMs = Date.now(),
): CheckoutTrialAlignment {
  const end = parseTrialEndsAt(trialEndsAt);
  if (!end || end.getTime() <= nowMs) {
    return { trialEndUnix: null, shouldDeferFirstCharge: false, trialEndsAt: null };
  }

  const minEndMs = nowMs + MIN_TRIAL_END_LEAD_MS;
  if (end.getTime() < minEndMs) {
    return { trialEndUnix: null, shouldDeferFirstCharge: false, trialEndsAt: null };
  }

  return {
    trialEndUnix: Math.floor(end.getTime() / 1000),
    shouldDeferFirstCharge: true,
    trialEndsAt: end,
  };
}
