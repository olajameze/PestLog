import Card from '../ui/Card';

export interface CompliancePoint {
  date: string;
  rate: number;
}

export interface ComplianceAction {
  id: string;
  title: string;
  area: string;
  dueDate: string;
}

interface ComplianceMonitorProps {
  compliance?: {
    series: CompliancePoint[];
    openActions: ComplianceAction[];
    currentRate: number;
  };
  loading: boolean;
  onTrendClick: () => void;
}

export default function ComplianceMonitor({ compliance, loading, onTrendClick }: ComplianceMonitorProps) {
  const points = compliance?.series ?? [];

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Compliance monitor</p>
          <h3 className="text-xl font-semibold text-navy">30-day compliance trend</h3>
        </div>
        <button type="button" onClick={onTrendClick} className="text-sm text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md">
          Drill down
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading compliance metrics…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-sm text-slate-500">Current compliance</p>
              <p className="text-3xl font-semibold text-navy">{compliance?.currentRate ?? 0}%</p>
            </div>
            <div className="text-right text-sm text-slate-600">Open corrective actions: {compliance?.openActions.length ?? 0}</div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-sm text-slate-500">
              <span>Trend over time</span>
              <span>{points.length} points</span>
            </div>
            <div className="flex items-end gap-2 overflow-hidden rounded-3xl bg-slate-100 p-4">
              {points.map((point) => (
                <div key={point.date} className="flex-1 text-center text-xs text-slate-600">
                  <div className="mx-auto mb-2 h-24 w-full rounded-full bg-primary-500/20" style={{ height: `${point.rate}%` }} />
                  <div>{point.date}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            {compliance?.openActions.slice(0, 3).map((action) => (
              <div key={action.id} className="rounded-3xl border border-zinc-200 bg-white p-4">
                <p className="font-semibold text-slate-900">{action.title}</p>
                <p className="mt-1 text-sm text-slate-600">{action.area} · {action.dueDate}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
