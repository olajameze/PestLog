import { NextRequest, NextResponse } from 'next/server';
import { normalizeOriginBase } from './lib/siteOrigin';

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

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname !== '/manifest.json') {
    return NextResponse.next();
  }

  const hostHeader = request.headers.get('host') ?? '';
  const hostNoPort = hostHeader.split(':')[0]?.toLowerCase() ?? '';
  if (!hostNoPort.endsWith('.vercel.app')) {
    return NextResponse.next();
  }

  const origin = canonicalPublicOrigin();
  if (!origin) {
    return NextResponse.next();
  }

  const target = new URL(`${origin.replace(/\/+$/, '')}/manifest.json`);
  if (target.hostname.toLowerCase() === hostNoPort) {
    return NextResponse.next();
  }

  return NextResponse.redirect(target, 307);
}

export const config = {
  matcher: ['/manifest.json'],
};
