import Card from '../ui/Card';

export interface UrgentAlert {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

interface UrgentAlertsProps {
  alerts: UrgentAlert[];
  loading: boolean;
  onActionClick: () => void;
}

export default function UrgentAlerts({ alerts, loading, onActionClick }: UrgentAlertsProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Urgent alerts</p>
          <h3 className="text-xl font-semibold text-navy">Immediate action required</h3>
        </div>
        <button type="button" onClick={onActionClick} className="text-sm text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md">
          Review
        </button>
      </div>
      <div className="mt-5 space-y-4">
        {loading ? (
          <p className="text-sm text-slate-500">Loading alerts…</p>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-slate-500">No urgent alerts for the selected range.</p>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="rounded-3xl border border-zinc-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{alert.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{alert.description}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${alert.severity === 'high' ? 'bg-red-100 text-red-700' : alert.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {alert.severity}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
