import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

type SessionUser = {
  id: string;
  email?: string;
};

function isEmailVerified(user: User): boolean {
  const u = user as User & { confirmed_at?: string | null; email_confirmed?: boolean };
  return Boolean(u.email_confirmed_at ?? u.confirmed_at ?? u.email_confirmed);
}

export function useRequireSession(redirectTo = '/auth/signin') {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const finishLoading = () => {
      if (!cancelled) setLoading(false);
    };

    const handleSession = (session: Session | null) => {
      if (!session?.user) {
        setUser(null);
        router.replace(redirectTo);
        finishLoading();
        return;
      }
      if (!isEmailVerified(session.user)) {
        const addr = session.user.email ?? '';
        router.replace(`/auth/verify?email=${encodeURIComponent(addr)}`);
        finishLoading();
        return;
      }
      setUser({ id: session.user.id, email: session.user.email ?? undefined });
      finishLoading();
    };

    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      handleSession(session);
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      handleSession(session);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [redirectTo, router]);

  return { user, loading };
}
