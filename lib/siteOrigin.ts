import type { NextApiRequest } from 'next';

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

export function resolveSiteOriginForApiRequest(req: NextApiRequest): string | null {
  const rawCandidates = [
    process.env.NEXT_PUBLIC_MANIFEST_ORIGIN,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
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

  for (const raw of rawCandidates) {
    const base = normalizeOriginBase(raw ?? undefined);
    if (base) return base;
  }

  return normalizeOriginBase(process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : '');
}
