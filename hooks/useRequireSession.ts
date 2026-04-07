import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

type SessionUser = {
  id: string;
  email?: string;
};

export function useRequireSession(redirectTo = '/auth/signin') {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push(redirectTo);
        return;
      }
      setUser(session.user);
      setLoading(false);
    };
    run();
  }, [redirectTo, router]);

  return { user, loading };
}
