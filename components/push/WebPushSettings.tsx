import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

type PushState = 'loading' | 'unsupported' | 'no_server_key' | 'idle' | 'subscribed' | 'denied';

export default function WebPushSettings() {
  const [state, setState] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const vapidPublic = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ?? '';

  const refreshSubscriptionState = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }
    if (!vapidPublic) {
      setState('no_server_key');
      return;
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      setState('denied');
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? 'subscribed' : 'idle');
    } catch {
      setState('idle');
    }
  }, [vapidPublic]);

  useEffect(() => {
    void refreshSubscriptionState();
  }, [refreshSubscriptionState]);

  const subscribe = async () => {
    if (!vapidPublic) return;
    setBusy(true);
    setMessage(null);
    try {
      if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          setState('denied');
          setMessage('Notifications are blocked for this site. Enable them in browser settings.');
          setBusy(false);
          return;
        }
      }

      const reg =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register('/sw.js'));
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublic),
      });

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMessage('You need to be signed in to enable push on this device.');
        setBusy(false);
        return;
      }

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        }),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        setMessage(errBody.error || 'Could not save push subscription.');
        setBusy(false);
        return;
      }

      setState('subscribed');
      setMessage('This device will get Pest Trace alerts when the app is in the background.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Push setup failed.');
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ endpoint }),
          });
        }
        await sub.unsubscribe();
      }
      setState('idle');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not disable push.');
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') {
    return <p className="text-xs text-slate-500">Checking push support…</p>;
  }

  if (state === 'unsupported') {
    return (
      <p className="text-xs text-slate-600">
        Browser push is not available here. Use a recent Chrome, Edge, or Firefox, install the app as a PWA, or open the
        site on Android. (iOS 16.4+ supports Web Push for installed PWAs.)
      </p>
    );
  }

  if (state === 'no_server_key') {
    return (
      <p className="text-xs text-amber-800 dark:text-amber-200">
        Push is not configured for this deployment. Add VAPID keys to the server environment, then redeploy: set{' '}
        <span className="font-mono">NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY</span> and{' '}
        <span className="font-mono">WEB_PUSH_VAPID_PRIVATE_KEY</span> (generate with{' '}
        <span className="font-mono">npx web-push generate-vapid-keys</span>). See <span className="font-mono">.env.example</span>{' '}
        under Web Push / Vercel.
      </p>
    );
  }

  if (state === 'denied') {
    return (
      <p className="text-xs text-amber-800">
        Notifications were blocked. Allow notifications for this site in your browser settings, then try again.
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-900">Device push alerts</p>
      <p className="mt-2 text-sm text-slate-700">
        Get Pest Trace alerts on this phone or computer when the tab is closed (after you install or use the supported
        browser).
      </p>
      {message ? <p className="mt-2 text-xs text-slate-700">{message}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {state === 'subscribed' ? (
          <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void unsubscribe()}>
            {busy ? 'Updating…' : 'Turn off push on this device'}
          </Button>
        ) : (
          <Button type="button" variant="primary" size="sm" disabled={busy} onClick={() => void subscribe()}>
            {busy ? 'Working…' : 'Enable push on this device'}
          </Button>
        )}
      </div>
    </div>
  );
}
