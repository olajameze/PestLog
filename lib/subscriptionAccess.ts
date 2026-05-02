import { checkPlan } from './planGuard';

type AccessSnapshot = {
  plan?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: string | Date | null;
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
  return trialEndMs !== null && trialEndMs > nowMs;
}

