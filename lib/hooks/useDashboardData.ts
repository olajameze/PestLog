import { useCallback, useEffect, useState } from 'react';
import { fetchDashboardData, DashboardData, DashboardDateRangeOption } from '../api/mockDashboardData';

export function useDashboardData(range: DashboardDateRangeOption) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    fetchDashboardData(range)
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
