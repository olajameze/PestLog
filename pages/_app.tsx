import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { ToastProvider } from '../components/ui/ToastProvider';
import PWAInstallPrompt from '../components/PWAInstallPrompt';

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
        <div className={`${inter.variable} h-full antialiased font-sans`}>
          <Component {...pageProps} />
        </div>
      </ToastProvider>
      <PWAInstallPrompt />
    </>
  );
}
