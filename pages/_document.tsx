import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en" data-scroll-behavior="smooth">
      <Head>
        {/* PWA & App Meta Tags */}
        <meta name="description" content="Digital compliance logbook for pest control businesses" />
        <meta name="theme-color" content="#2563EB" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Web App Manifest: prefer absolute canonical URL — see .env.example (Vercel Preview + protection). */}
        <link
          rel="manifest"
          href={
            (() => {
              const candidates = [
                process.env.NEXT_PUBLIC_MANIFEST_ORIGIN,
                process.env.NEXT_PUBLIC_APP_URL,
                process.env.NEXT_PUBLIC_SITE_URL,
                ...(process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
                  ? [
                      process.env.VERCEL_PROJECT_PRODUCTION_URL.trim().startsWith('http')
                        ? process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()
                        : `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`,
                    ]
                  : []),
              ];
              const baseRaw = candidates.find(
                (x): x is string => typeof x === 'string' && x.trim().length > 0,
              );
              const base = baseRaw?.trim().replace(/\/+$/, '') ?? '';
              return base && /^https?:\/\//i.test(base)
                ? `${base}/manifest.json`
                : '/manifest.json';
            })()
          }
        />
        <link rel="canonical" href="https://pesttrace.com" />
        <meta property="og:url" content="https://pesttrace.com" />
        <meta property="og:site_name" content="Pest Trace" />
        <meta name="twitter:url" content="https://pesttrace.com" />

        {/* Apple iOS PWA Support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Pest Trace" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Standard Favicons */}
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />

        {/* PWA Icons */}
        <link rel="icon" type="image/png" sizes="192x192 512x512" href="/pest-trace.png" />

        {/* Fonts - handled by next/font/google in _app.tsx */}

        {/* Keep startup assets minimal to avoid broken links in production */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

