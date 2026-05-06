import { checkPlan } from './planGuard';

type AccessSnapshot = {
  plan?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: string | Date | null;
  paymentGraceEndsAt?: string | Date | null;
};

function parseTrialEnd(value: AccessSnapshot['trialEndsAt']): number | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  const timestamp = parsed.getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function hasSubscriptionAccess(snapshot: AccessSnapshot, nowMs = Date.now()): boolean {
  const status = snapshot.subscriptionStatus ? String(snapshot.subscriptionStatus).toLowerCase() : '';
  const planNorm = snapshot.plan ? String(snapshot.plan).toLowerCase().trim() : '';
  const hasPaidTierName =
    planNorm !== '' && checkPlan(planNorm, ['pro', 'business', 'enterprise']);

  // Paid SKU in DB alone must not unlock access (avoids orphaned plan values / webhook drift).
  if (hasPaidTierName && status === 'active') {
    return true;
  }

  if (status === 'active') {
    return true;
  }

  const trialEndMs = parseTrialEnd(snapshot.trialEndsAt);
  if (trialEndMs !== null && trialEndMs > nowMs) {
    return true;
  }

  const graceEndMs = parseTrialEnd(snapshot.paymentGraceEndsAt);
  return graceEndMs !== null && graceEndMs > nowMs;
}

/** Billing badge: paid tiers show only when Stripe subscription status is active. */
export function formatOwnerBillingPlanLabel(
  snapshot: Pick<AccessSnapshot, 'plan' | 'subscriptionStatus'>,
): string {
  const plan = String(snapshot.plan ?? 'trial').toLowerCase().trim();
  const status = snapshot.subscriptionStatus
    ? String(snapshot.subscriptionStatus).toLowerCase().trim()
    : '';

  const isPaidTier = checkPlan(plan, ['pro', 'business', 'enterprise']);
  if (status === 'active' && isPaidTier) {
    return plan;
  }

  if (isPaidTier && status !== 'active') {
    return 'free trial';
  }

  if (plan === 'free') {
    return 'free';
  }

  return 'free trial';
}

export function getGraceDaysLeft(snapshot: AccessSnapshot, nowMs = Date.now()): number | null {
  const graceEndMs = parseTrialEnd(snapshot.paymentGraceEndsAt);
  if (graceEndMs === null || graceEndMs <= nowMs) {
    return null;
  }
  return Math.max(1, Math.ceil((graceEndMs - nowMs) / (1000 * 60 * 60 * 24)));
}

