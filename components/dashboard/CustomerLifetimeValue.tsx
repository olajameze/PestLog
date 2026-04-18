import Card from '../ui/Card';

interface CustomerValue {
  clv: number;
  cac: number;
  trend: number[];
}

interface CustomerLifetimeValueProps {
  customerValue?: CustomerValue;
  loading: boolean;
}

const TREND_BAR_MIN_PX = 28;
const TREND_BAR_MAX_PX = 112;

function trendBarHeightsPx(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((v) => {
    const t = (v - min) / span;
    return Math.round(TREND_BAR_MIN_PX + t * (TREND_BAR_MAX_PX - TREND_BAR_MIN_PX));
  });
}

export default function CustomerLifetimeValue({ customerValue, loading }: CustomerLifetimeValueProps) {
  const trendSeries = customerValue?.trend ?? [];
  const trendHeightsPx = trendBarHeightsPx(trendSeries);
  const ratio = customerValue ? (customerValue.clv / customerValue.cac).toFixed(1) : '0.0';

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Customer lifetime value</p>
        <h3 className="text-xl font-semibold text-navy">CLV / CAC ratio</h3>
      </div>
      {loading ? (
        <p className="text-sm text-slate-500">Loading analytics…</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-sm text-slate-500">Lifetime value</p>
              <p className="text-3xl font-semibold text-navy">£{customerValue?.clv.toLocaleString() ?? '0'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">CAC</p>
              <p className="text-xl font-semibold text-primary-600">£{customerValue?.cac ?? 0}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4">
            <div>
              <p className="text-sm text-slate-500">CLV/CAC ratio</p>
              <p className="text-2xl font-semibold text-navy">{ratio}:1</p>
            </div>
            <div className="text-sm text-slate-600">Higher ratios mean stronger customer return.</div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Trend</p>
            <div
              className="flex h-32 max-h-32 min-h-32 items-end gap-2"
              role="img"
              aria-label={`CLV trend across ${trendSeries.length} periods (relative scale)`}
            >
              {trendSeries.map((value, index) => (
                <div
                  key={index}
                  className="min-w-0 flex-1 rounded-t-md bg-primary-500/50 transition-[height] duration-300"
                  style={{ height: `${trendHeightsPx[index] ?? TREND_BAR_MIN_PX}px` }}
                  title={`£${value.toLocaleString()}`}
                  aria-label={`Period ${index + 1}: £${value.toLocaleString()}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
