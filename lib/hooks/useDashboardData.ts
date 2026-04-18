import { useCallback, useEffect, useState } from 'react';
import type { DashboardData, DashboardDateRangeOption } from '../api/mockDashboardData';
import { fetchDashboardInsights } from '../api/dashboardInsightsClient';

export function useDashboardData(range: DashboardDateRangeOption) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) setLoading(true);
    });

    fetchDashboardInsights(range)
      .then((result) => {
        if (!mounted) return;
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setData(null);
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [range, refreshKey]);

  return { data, loading, refresh };
}
