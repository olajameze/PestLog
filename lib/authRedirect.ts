const DEFAULT_POST_AUTH = '/dashboard';

/**
 * Restrict open redirects: only same-origin paths starting with a single "/".
 */
export function sanitizeInternalNextPath(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) {
    return DEFAULT_POST_AUTH;
  }
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return DEFAULT_POST_AUTH;
  }
  return trimmed;
}

/**
 * Supabase `signUp` / `generate_link`: `emailRedirectTo` (client) and `redirect_to` (admin API) must match URLs allowlisted in the Supabase project.
 */
export function authCallbackUrl(baseUrl: string, nextPath: string = DEFAULT_POST_AUTH): string {
  const trimmedBase = baseUrl.replace(/\/$/, '');
  const next = sanitizeInternalNextPath(nextPath);
  return `${trimmedBase}/auth/callback?next=${encodeURIComponent(next)}`;
}
