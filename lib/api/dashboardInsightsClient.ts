import { supabase } from '../supabase';
import type { DashboardData, DashboardDateRangeOption } from './mockDashboardData';

export async function fetchDashboardInsights(range: DashboardDateRangeOption): Promise<DashboardData> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not signed in');
  }

  const res = await fetch(`/api/dashboard-insights?range=${range}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `Request failed (${res.status})`);
  }

  return res.json() as Promise<DashboardData>;
}
