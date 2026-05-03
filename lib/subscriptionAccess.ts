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
  if (snapshot.plan && checkPlan(snapshot.plan, ['pro', 'business', 'enterprise'])) {
    return true;
  }

  if (snapshot.subscriptionStatus === 'active') {
    return true;
  }

  const trialEndMs = parseTrialEnd(snapshot.trialEndsAt);
  if (trialEndMs !== null && trialEndMs > nowMs) {
    return true;
  }

  const graceEndMs = parseTrialEnd(snapshot.paymentGraceEndsAt);
  return graceEndMs !== null && graceEndMs > nowMs;
}

export function getGraceDaysLeft(snapshot: AccessSnapshot, nowMs = Date.now()): number | null {
  const graceEndMs = parseTrialEnd(snapshot.paymentGraceEndsAt);
  if (graceEndMs === null || graceEndMs <= nowMs) {
    return null;
  }
  return Math.max(1, Math.ceil((graceEndMs - nowMs) / (1000 * 60 * 60 * 24)));
}

