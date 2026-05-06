import { useMemo } from 'react';

export type UserPlan = 'trial' | 'pro' | 'business' | 'enterprise';

export function useUserPlan(plan?: string): UserPlan {
  return useMemo(() => {
    if (plan === 'trial' || plan === 'pro' || plan === 'business' || plan === 'enterprise') {
      return plan;
    }

    return 'trial';
  }, [plan]);
}
