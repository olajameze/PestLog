/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import Image from 'next/image';
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

export default function PWAInstallPrompt() {
  const [deviceInfo, setDeviceInfo] = useState({ isIOS: false, isAndroid: false });
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const forcePrompt = new URLSearchParams(window.location.search).get('showPwaPrompt') === '1';
    const dismissedAt = localStorage.getItem('pwa-prompt-dismissed');
    if (!forcePrompt && dismissedAt) {
      const dismissedTs = Number(dismissedAt);
      const oneDay = 24 * 60 * 60 * 1000;
      if (!Number.isNaN(dismissedTs) && Date.now() - dismissedTs < oneDay) {
        return;
      }
    }

    const alreadyInstalled = window.matchMedia('(display-mode: standalone)').matches;
    if (alreadyInstalled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsInstalled(true);
      return;
    }

    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isAndroid = /Android/.test(userAgent);
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    setIsMobileViewport(isMobile);
    setDeviceInfo({ isIOS, isAndroid });

    // Show by default on mobile so users can discover install flow,
    // and also when browser exposes the install event.
    if (isIOS || isAndroid || isMobile || forcePrompt) {
      setIsVisible(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as unknown as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      setIsVisible(false);
      setIsInstalled(true);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deviceInfo.isAndroid && deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsVisible(false);
        }
        setDeferredPrompt(null);
      } catch (error) {
        void error;
      }
    } else if (deviceInfo.isIOS || isMobileViewport) {
      alert(
        "To install Pest Trace on your iPhone:\n\n" +
        "1. Tap the Share button (box with arrow)\n" +
        "2. Scroll down and tap 'Add to Home Screen'\n" +
        "3. Tap 'Add' to confirm\n\n" +
        "The app will now appear on your home screen!"
      );
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa-prompt-dismissed', new Date().getTime().toString());
  };

  if (isInstalled || !isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-900 dark:to-blue-800 text-white shadow-2xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="shrink-0">
              <Image src="/pest-trace.png" alt="Pest Trace logo" width={40} height={40} className="h-10 w-10 object-contain" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Install Pest Trace</h3>
              <p className="text-blue-100 text-sm">
                {deviceInfo.isIOS ? 'Add to your home screen for quick access' : 'Get the app instantly'}
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleDismiss}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 transition text-white font-medium text-sm"
            >
              Later
            </button>
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 rounded-lg bg-white hover:bg-gray-100 transition text-blue-600 font-bold text-sm shadow-lg"
            >
              {deviceInfo.isIOS || isMobileViewport ? 'Instructions' : 'Install'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}