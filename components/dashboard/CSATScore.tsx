import Card from '../ui/Card';

interface CSATData {
  average: number;
  nps: number;
  trend: number[];
}

interface CSATScoreProps {
  csat?: CSATData;
  loading: boolean;
}

export default function CSATScore({ csat, loading }: CSATScoreProps) {
  const trend = csat?.trend ?? [];

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Customer satisfaction</p>
        <h3 className="text-xl font-semibold text-navy">CSAT & NPS trend</h3>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading satisfaction analytics…</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-sm text-slate-500">Average CSAT</p>
              <p className="mt-2 text-3xl font-semibold text-navy">{csat?.average.toFixed(1) ?? '0.0'}/5</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-sm text-slate-500">Net Promoter Score</p>
              <p className="mt-2 text-3xl font-semibold text-primary-600">{csat?.nps ?? 0}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <span>Survey response trend</span>
              <span>{trend.length} points</span>
            </div>
            <div className="flex items-end gap-2 rounded-3xl bg-slate-100 p-3">
              {trend.map((value, index) => (
                <div key={index} className="flex-1 rounded-full bg-primary-500/20" style={{ height: `${Math.max(30, value * 16)}px` }} aria-label={`CSAT trend ${value}`} />
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
