import type { NextApiRequest } from 'next';

function isLoopbackOrigin(base: string | null | undefined): boolean {
  if (!base) return false;
  try {
    const u = new URL(base);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/** True when deployed on Vercel (avoid using localhost NEXT_PUBLIC_* for server-side redirects there). */
function isRunningOnVercel(): boolean {
  return typeof process.env.VERCEL_ENV === 'string' || typeof process.env.VERCEL === 'string';
}

function vercelProductionOriginRaw(): string | undefined {
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (!prod) return undefined;
  return prod.startsWith('http') ? prod : `https://${prod}`;
}

/** Build an absolute https? origin for redirects (Stripe return URLs, Customer Portal). */
export function normalizeOriginBase(raw?: string): string | null {
  if (typeof raw !== 'string') return null;
  let v = raw.trim();
  if (!v) return null;
  v = v.replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(v)) {
    const hostOnly = v.split('/')[0] ?? '';
    const isLocalHost = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(hostOnly);
    v = `${isLocalHost ? 'http://' : 'https://'}${v}`;
  }
  try {
    const parsed = new URL(v);
    if (!parsed.hostname) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

/**
 * Public manifest URL for <link rel="manifest"> — prefer canonical production origins on Vercel
 * previews (Deployment Protection returns 401 for same-origin /manifest.json fetches otherwise).
 */
export function getWebManifestLinkHref(): string {
  const rawCandidates: Array<string | undefined> = [
    typeof process.env.NEXT_PUBLIC_MANIFEST_ORIGIN === 'string'
      ? process.env.NEXT_PUBLIC_MANIFEST_ORIGIN.trim()
      : undefined,
    vercelProductionOriginRaw(),
    typeof process.env.NEXT_PUBLIC_SITE_URL === 'string' ? process.env.NEXT_PUBLIC_SITE_URL.trim() : undefined,
    typeof process.env.NEXT_PUBLIC_APP_URL === 'string' ? process.env.NEXT_PUBLIC_APP_URL.trim() : undefined,
  ];

  for (const raw of rawCandidates) {
    const base = normalizeOriginBase(raw ?? undefined);
    if (!base) continue;
    if (isLoopbackOrigin(base)) continue;
    return `${base}/manifest.json`;
  }
  return '/manifest.json';
}

/** Absolute return URL for Stripe Customer Portal; falls back if env is relative or invalid. */
export function resolveStripePortalReturnUrl(defaultReturn: string): string {
  const raw = process.env.STRIPE_PORTAL_RETURN_URL?.trim();
  if (!raw) return defaultReturn;
  let candidate = raw;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/+/, '')}`;
  }
  try {
    const u = new URL(candidate);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return defaultReturn;
    if (process.env.NODE_ENV === 'production' && u.protocol === 'http:' && !isLoopbackOrigin(u.origin)) {
      return defaultReturn;
    }
    return u.href;
  } catch {
    return defaultReturn;
  }
}

export function resolveSiteOriginForApiRequest(req: NextApiRequest): string | null {
  const rawCandidates = [
    process.env.NEXT_PUBLIC_MANIFEST_ORIGIN,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    vercelProductionOriginRaw(),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    typeof req.headers.origin === 'string' ? req.headers.origin : undefined,
  ];

  const protoHeader = req.headers['x-forwarded-proto'];
  const xfHost = req.headers.host;
  if (typeof xfHost === 'string' && typeof protoHeader === 'string') {
    const p = protoHeader.split(',')[0]?.trim().toLowerCase();
    const h = xfHost.split(',')[0]?.trim();
    if ((p === 'http' || p === 'https') && h) {
      rawCandidates.push(`${p}://${h}`);
    }
  }

  const skipLoopbackPublic = isRunningOnVercel();

  for (const raw of rawCandidates) {
    const base = normalizeOriginBase(raw ?? undefined);
    if (!base) continue;
    if (skipLoopbackPublic && isLoopbackOrigin(base)) continue;
    return base;
  }

  if (process.env.NODE_ENV !== 'production') {
    return normalizeOriginBase('http://localhost:3000');
  }
  return null;
}
