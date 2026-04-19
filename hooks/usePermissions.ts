import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { buildPermissions, type Permissions } from '../lib/rbac/roles';

type Profile = {
  role?: unknown;
  plan?: unknown;
};

export function usePermissions(): Permissions & { loading: boolean } {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user.id;
      if (!userId) {
        if (mounted) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      const result = await supabase.from('profiles').select('role, plan').eq('id', userId).single();
      if (!mounted) return;
      setProfile(result.data ?? null);
      setLoading(false);
    }

    load();

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      load();
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const permissions = useMemo(() => buildPermissions(profile?.role, profile?.plan), [profile]);
  return { ...permissions, loading };
}

