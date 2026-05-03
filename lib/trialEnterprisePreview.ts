export type TrialSnapshot = {
  plan?: string | null;
  trialEndsAt?: string | Date | null;
};

function parseEnd(value: TrialSnapshot['trialEndsAt']): number | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

/** `plan === 'trial'` and trial end is in the future. */
export function isActiveTrial(snapshot: TrialSnapshot, nowMs = Date.now()): boolean {
  if (snapshot.plan !== 'trial') return false;
  const end = parseEnd(snapshot.trialEndsAt);
  return end !== null && end > nowMs;
}

/** Paid Enterprise or active trial preview window. */
export function canUseEnterprisePreview(snapshot: TrialSnapshot, nowMs = Date.now()): boolean {
  if (snapshot.plan === 'enterprise') return true;
  return isActiveTrial(snapshot, nowMs);
}

/** Full days remaining in trial (ceiling), or `null` if not on an active trial. */
export function trialFullDaysRemaining(snapshot: TrialSnapshot, nowMs = Date.now()): number | null {
  if (!isActiveTrial(snapshot, nowMs)) return null;
  const end = parseEnd(snapshot.trialEndsAt);
  if (end === null) return null;
  const ms = end - nowMs;
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
