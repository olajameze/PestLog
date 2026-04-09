import type { AppProps } from 'next/app';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import { ToastProvider } from '../components/ui/ToastProvider';
import PWAInstallPrompt from '../components/PWAInstallPrompt';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export default function App({ Component, pageProps }: AppProps) {
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
