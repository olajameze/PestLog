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
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const markUpdate = () => setUpdateAvailable(true);

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PESTTRACE_SW_UPDATE') {
        markUpdate();
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);

    const onControllerChange = () => markUpdate();
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            markUpdate();
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

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

  if (isInstalled || !isVisible) {
    if (!updateAvailable) return null;
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[60] px-3 pb-safe">
        <div className="mx-auto mb-2 max-w-3xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-medium">A new version of Pest Trace is ready.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-amber-500"
            >
              Reload to update
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-900 dark:to-blue-800 text-white shadow-2xl">
        {updateAvailable ? (
          <div className="border-b border-white/20 bg-blue-800/40 px-4 py-2 text-center text-sm text-blue-50">
            <span className="font-semibold">Update available.</span>{' '}
            <button type="button" className="underline font-semibold" onClick={() => window.location.reload()}>
              Reload
            </button>{' '}
            to use the latest version.
          </div>
        ) : null}
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