import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { normalizeOriginBase } from './lib/siteOrigin';

const PUBLIC_PATH_PREFIXES = [
  '/_next',
  '/api',
  '/favicon',
  '/manifest',
  '/icon-',
  '/apple-touch-icon',
  '/sw.js',
  '/workbox-',
  '/images',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** Avoid 401 manifest fetches on Vercel previews (Deployment Protection on *.vercel.app). */
function canonicalPublicOrigin(): string | null {
  const preferred = [
    process.env.NEXT_PUBLIC_MANIFEST_ORIGIN,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
  ];
  for (const raw of preferred) {
    const o = normalizeOriginBase(typeof raw === 'string' ? raw : undefined);
    if (o) return o;
  }
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (prod?.startsWith('http')) return normalizeOriginBase(prod);
  if (prod) return normalizeOriginBase(`https://${prod}`);
  return null;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/manifest.json') {
    const hostHeader = request.headers.get('host') ?? '';
    const hostNoPort = hostHeader.split(':')[0]?.toLowerCase() ?? '';
    if (hostNoPort.endsWith('.vercel.app')) {
      const origin = canonicalPublicOrigin();
      if (origin) {
        const target = new URL(`${origin.replace(/\/+$/, '')}/manifest.json`);
        if (target.hostname.toLowerCase() !== hostNoPort) {
          return NextResponse.redirect(target, 307);
        }
      }
    }
  }

  const maintenanceModeEnabled = process.env.MAINTENANCE_MODE === 'true';
  if (!maintenanceModeEnabled) return NextResponse.next();

  if (pathname === '/maintenance') return NextResponse.next();
  if (isPublicPath(pathname)) return NextResponse.next();

  const maintenanceUrl = request.nextUrl.clone();
  maintenanceUrl.pathname = '/maintenance';
  maintenanceUrl.search = '';
  return NextResponse.redirect(maintenanceUrl);
}

export const config = {
  matcher: '/:path*',
};
