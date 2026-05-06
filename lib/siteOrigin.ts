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

/**
 * Stripe customer portal rejects return_url when the hostname looks invalid (e.g. bare
 * single-label hosts). Skip such values when resolving API/site origins for billing redirects.
 */
function originHostStripeSafe(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1') return true;
    return h.includes('.');
  } catch {
    return false;
  }
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
  if (!raw) return assertStripeReturnUrlOrDefault(defaultReturn, defaultReturn);

  let resolved: URL;
  try {
    if (/^https?:\/\//i.test(raw)) {
      resolved = new URL(raw);
    } else if (raw.startsWith('/') || raw.startsWith('?')) {
      resolved = new URL(raw, defaultReturn);
    } else if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([/:?#]|$)/i.test(raw)) {
      resolved = new URL(`https://${raw}`);
    } else {
      resolved = new URL(raw.startsWith('/') ? raw : `/${raw}`, defaultReturn);
    }
  } catch {
    return assertStripeReturnUrlOrDefault(defaultReturn, defaultReturn);
  }

  if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
    return assertStripeReturnUrlOrDefault(defaultReturn, defaultReturn);
  }
  if (
    process.env.NODE_ENV === 'production' &&
    resolved.protocol === 'http:' &&
    !isLoopbackOrigin(resolved.origin)
  ) {
    return assertStripeReturnUrlOrDefault(defaultReturn, defaultReturn);
  }
  if (!originHostStripeSafe(resolved.origin)) {
    return assertStripeReturnUrlOrDefault(defaultReturn, defaultReturn);
  }
  return resolved.href.split('#')[0] ?? resolved.href;
}

/** Strip BOM / odd whitespace so Stripe parses return_url from env/request. */
export function sanitizeUrlForStripe(raw: string): string | null {
  const trimmed = raw.replace(/^\uFEFF/, '').trim();
  try {
    const u = new URL(trimmed.normalize('NFKC'));
    return u.href.split('#')[0] ?? u.href;
  } catch {
    return null;
  }
}

function assertStripeReturnUrlOrDefault(candidate: string, fallback: string): string {
  try {
    const u = new URL(candidate);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return fallback;
    }
    if (!originHostStripeSafe(u.origin)) {
      return fallback;
    }
    if (
      process.env.NODE_ENV === 'production' &&
      u.protocol === 'http:' &&
      !isLoopbackOrigin(u.origin)
    ) {
      return fallback;
    }
    return u.href.split('#')[0] ?? u.href;
  } catch {
    return fallback;
  }
}

/**
 * Ordered billing-related origins (incoming request first, then env). Used for Stripe return_url fallbacks.
 * Does not use NEXT_PUBLIC_MANIFEST_ORIGIN.
 */
export function listBillingOriginCandidates(req: NextApiRequest): string[] {
  const forwardedHostRaw = req.headers['x-forwarded-host'];
  const hostRaw = req.headers.host;
  const xfHostFirst =
    (typeof forwardedHostRaw === 'string' ? forwardedHostRaw.split(',')[0]?.trim() : '') ||
    (typeof hostRaw === 'string' ? hostRaw.split(',')[0]?.trim() : '');
  const protoRaw = req.headers['x-forwarded-proto'];
  const protoFirst =
    (typeof protoRaw === 'string' ? protoRaw.split(',')[0]?.trim().toLowerCase() : '') || '';

  const fromIncoming: string[] = [];
  if (xfHostFirst && (protoFirst === 'http' || protoFirst === 'https')) {
    fromIncoming.push(`${protoFirst}://${xfHostFirst}`);
  }
  if (xfHostFirst && !protoFirst && isRunningOnVercel()) {
    fromIncoming.push(`https://${xfHostFirst}`);
  }
  if (typeof req.headers.origin === 'string' && req.headers.origin.trim()) {
    fromIncoming.push(req.headers.origin.trim());
  }

  const rawCandidates = [
    ...fromIncoming,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    vercelProductionOriginRaw(),
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
  ];

  const skipLoopbackPublic = isRunningOnVercel();

  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of rawCandidates) {
    const base = normalizeOriginBase(raw ?? undefined);
    if (!base) continue;
    if (skipLoopbackPublic && isLoopbackOrigin(base)) continue;
    if (!originHostStripeSafe(base)) continue;
    if (seen.has(base)) continue;
    seen.add(base);
    out.push(base);
  }

  if (process.env.NODE_ENV !== 'production') {
    const local = normalizeOriginBase('http://localhost:3000');
    if (local && !seen.has(local)) {
      out.push(local);
    }
  }

  return out;
}

/** Full return URLs to try for Stripe Customer Portal (same path the app uses after billing). */
export function listStripePortalReturnUrlCandidates(req: NextApiRequest): string[] {
  const origins = listBillingOriginCandidates(req);
  const dashboardPaths = origins.map((o) => `${o.replace(/\/+$/, '')}/dashboard?tab=settings`);

  const seen = new Set<string>();
  const ordered: string[] = [];

  const push = (u: string) => {
    const v = sanitizeUrlForStripe(u);
    if (!v || seen.has(v)) return;
    seen.add(v);
    ordered.push(v);
  };

  if (process.env.STRIPE_PORTAL_RETURN_URL?.trim()) {
    const baseForEnv = dashboardPaths[0] ?? 'http://localhost:3000/dashboard?tab=settings';
    push(resolveStripePortalReturnUrl(baseForEnv));
  }

  for (const d of dashboardPaths) {
    push(assertStripeReturnUrlOrDefault(d, d));
  }

  return ordered;
}

export function resolveSiteOriginForApiRequest(req: NextApiRequest): string | null {
  const candidates = listBillingOriginCandidates(req);
  return candidates[0] ?? (process.env.NODE_ENV !== 'production' ? normalizeOriginBase('http://localhost:3000') : null);
}
