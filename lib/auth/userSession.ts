/**
 * Canonical email for lookups tied to Supabase JWT (consistent with OTP signup normalization).
 */
export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Set only by technician invite signup (`technician-signup`). */
export function isDedicatedTechnicianSession(user: {
  user_metadata?: Record<string, unknown> | null;
}): boolean {
  return user.user_metadata?.role === 'technician';
}
