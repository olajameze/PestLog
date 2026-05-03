import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { Inter } from 'next/font/google';
import dynamic from 'next/dynamic';
import '../styles/globals.css';
import { ToastProvider } from '../components/ui/ToastProvider';

const PWAInstallPrompt = dynamic(() => import('../components/PWAInstallPrompt'), { ssr: false });
const NotificationCenter = dynamic(() => import('../components/notifications/NotificationCenter'), { ssr: false });
const OfflineBanner = dynamic(() => import('../components/offline/OfflineBanner'), { ssr: false });

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return (
    <>
      <ToastProvider>
        <div className={`${inter.variable} min-h-screen overflow-x-hidden antialiased font-sans`}>
          <Component {...pageProps} />
        </div>
      </ToastProvider>
      <OfflineBanner />
      <NotificationCenter />
      <PWAInstallPrompt />
    </>
  );
}
