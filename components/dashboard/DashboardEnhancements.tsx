import { useMemo } from 'react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import TodaySchedule from './TodaySchedule';
import ComplianceMonitor from './ComplianceMonitor';
import ChemicalLog from './ChemicalLog';
import UrgentAlerts from './UrgentAlerts';
import CustomerLifetimeValue from './CustomerLifetimeValue';
import RetentionChurn from './RetentionChurn';
import CSATScore from './CSATScore';
import { useUserPlan } from '../../lib/auth/plan';
import { useDateRange } from '../../lib/hooks/useDateRange';
import { useDashboardData } from '../../lib/hooks/useDashboardData';
import { logger } from '../../lib/logger';

interface DashboardEnhancementsProps {
  plan?: string;
}

export default function DashboardEnhancements({ plan }: DashboardEnhancementsProps) {
  const userPlan = useUserPlan(plan);
  const { range, setRange, options } = useDateRange();
  const { data, loading, refresh } = useDashboardData(range);

  const showAnalytics = userPlan === 'business' || userPlan === 'enterprise';
  const showEnterprise = userPlan === 'enterprise';

  const planDescription = useMemo(() => {
    if (userPlan === 'enterprise') return 'Enterprise analytics are available.';
    if (userPlan === 'business') return 'Business customers have CLV tracking and ratio insights.';
    return 'Upgrade to Business to unlock customer analytics and retention reporting.';
  }, [userPlan]);

  return (
    <section aria-labelledby="dashboard-enhancements-heading" className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Dashboard insights</p>
            <h2 id="dashboard-enhancements-heading" className="text-2xl font-semibold text-navy">Operational & customer visibility</h2>
            <p className="mt-2 text-sm text-slate-600">
              Operational metrics are computed from your logbook, certifications, and company rules. Business and Enterprise plans unlock the customer analytics cards below.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {options.map((option) => (
              <Button
                key={option}
                variant={range === option ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setRange(option)}
                className="min-w-[70px]"
                aria-pressed={range === option}
              >
                Last {option}d
              </Button>
            ))}
            <Button size="sm" variant="secondary" onClick={() => refresh()} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <UrgentAlerts alerts={data?.urgentAlerts ?? []} loading={loading} onActionClick={() => logger.info('Urgent alert clicked')} />
        <TodaySchedule schedule={data?.todaySchedule} loading={loading} onMapClick={() => logger.info('Schedule map clicked')} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ComplianceMonitor compliance={data?.compliance} loading={loading} onTrendClick={() => logger.info('Compliance trend clicked')} />
        <ChemicalLog chemicalLog={data?.chemicalLog ?? []} loading={loading} onRowClick={() => logger.info('Chemical log row clicked')} />
      </div>

      <details className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm" open>
        <summary className="cursor-pointer text-lg font-semibold text-navy">Customer & retention analytics</summary>
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-600">{planDescription}</p>
          {showAnalytics ? (
            <div className="grid gap-6 xl:grid-cols-3">
              <CustomerLifetimeValue customerValue={data?.customerValue} loading={loading} />
              {showEnterprise ? <RetentionChurn retention={data?.retention} loading={loading} /> : null}
              {showEnterprise ? <CSATScore csat={data?.csat} loading={loading} /> : null}
            </div>
          ) : (
            <Card className="border-dashed border-slate-300 bg-slate-50 text-slate-700">
              <p className="text-sm font-medium text-slate-900">Customer analytics are locked.</p>
              <p className="mt-2 text-sm">Upgrade to Business or Enterprise to view CLV tracking, retention analytics, and CSAT trends.</p>
            </Card>
          )}
        </div>
      </details>
    </section>
  );
}
