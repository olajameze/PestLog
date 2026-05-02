import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en" data-scroll-behavior="smooth">
      <Head>
        {/* PWA & App Meta Tags */}
        <meta name="description" content="Digital compliance logbook for pest control businesses" />
        <meta name="theme-color" content="#2563EB" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Web App Manifest - MUST be in head for PWA */}
        <link rel="manifest" href="/manifest.json" />
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

