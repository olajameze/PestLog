import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

export type SubscriptionState = {
  status: string;
  trialEndsAt?: string;
};

export function useSubscriptionGate() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        setLoading(false);
        return;
      }

      const data = await res.json();
      setSubscription(data);
      const trialExpired = !data.trialEndsAt || new Date(data.trialEndsAt).getTime() < Date.now();
      if (data.status !== 'active' && trialExpired) {
        router.push('/upgrade');
        return;
      }
      setLoading(false);
    };
    run();
  }, [router]);

  return { subscription, loading };
}
