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

const CSAT_BAR_MIN_PX = 28;
const CSAT_BAR_MAX_PX = 112;

function csatTrendBarHeightsPx(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((v) => {
    const t = (v - min) / span;
    return Math.round(CSAT_BAR_MIN_PX + t * (CSAT_BAR_MAX_PX - CSAT_BAR_MIN_PX));
  });
}

export default function CSATScore({ csat, loading }: CSATScoreProps) {
  const trend = csat?.trend ?? [];
  const trendHeightsPx = csatTrendBarHeightsPx(trend);

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
            <div
              className="flex h-32 max-h-32 min-h-32 items-end gap-2 rounded-3xl bg-slate-100 p-3"
              role="img"
              aria-label={`CSAT trend across ${trend.length} survey periods (relative scale)`}
            >
              {trend.map((value, index) => (
                <div
                  key={index}
                  className="min-w-0 flex-1 rounded-t-md bg-primary-500/50"
                  style={{ height: `${trendHeightsPx[index] ?? CSAT_BAR_MIN_PX}px` }}
                  title={`Score ${value.toFixed(1)} / 5`}
                  aria-label={`Period ${index + 1}: score ${value.toFixed(1)} out of 5`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
