import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

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

export function proxy(request: NextRequest) {
  const maintenanceModeEnabled = process.env.MAINTENANCE_MODE === 'true';
  if (!maintenanceModeEnabled) return NextResponse.next();

  const { pathname } = request.nextUrl;
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

