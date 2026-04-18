/** Shared default when env vars are unset (keep in sync with lib/email.ts). */
export const DEFAULT_SUPPORT_EMAIL = 'pesttrace@gmail.com';

export function getServerSupportEmail(): string {
  return process.env.SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL;
}

/** Use in browser-only UI; set NEXT_PUBLIC_SUPPORT_EMAIL to match production support inbox. */
export function getClientSupportEmail(): string {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL;
}
