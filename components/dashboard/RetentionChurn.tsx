import Card from '../ui/Card';

interface RetentionData {
  retentionRate: number;
  reasons: Array<{ reason: string; count: number }>;
}

interface RetentionChurnProps {
  retention?: RetentionData;
  loading: boolean;
}

export default function RetentionChurn({ retention, loading }: RetentionChurnProps) {
  const reasons = retention?.reasons ?? [];

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Retention & churn</p>
        <h3 className="text-xl font-semibold text-navy">Customer retention rate</h3>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading retention analytics…</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-sm text-slate-500">Retention rate</p>
            <p className="mt-2 text-3xl font-semibold text-navy">{retention?.retentionRate ?? 0}%</p>
          </div>
          <div className="space-y-3">
            {reasons.map((entry) => (
              <div key={entry.reason} className="rounded-3xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-medium text-slate-900">{entry.reason}</p>
                  <span className="text-sm text-slate-600">{entry.count} reports</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-primary-500" style={{ width: `${Math.min(100, entry.count * 10)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
