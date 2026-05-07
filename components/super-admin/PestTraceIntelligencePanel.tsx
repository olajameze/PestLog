'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { saveIntelligenceExecutivePdf } from '../../lib/intelligence/intelligenceExecutivePdf';
import { buildGeoHeatmap, heatmapCssColor } from '../../lib/intelligence/geoHeatmap';
import IntelligenceGeoHeatmap from './IntelligenceGeoHeatmap';
import Button from '../ui/Button';
import { useToast } from '../ui/ToastProvider';

type Summary = {
  total: number;
  byPestType: { name: string; count: number }[];
  byOutcome: { name: string; count: number }[];
  bySeverity: { name: string; count: number }[];
  byProperty: { name: string; count: number }[];
  bySeason: { name: string; count: number }[];
  byEffectiveness: { name: string; count: number }[];
  postcodeRankings: { area: string; count: number }[];
  postcodeRedactedNote: string | null;
  heatmapPoints: { lat: number; lng: number; weight: number; pestType: string }[];
  dayTrend: { day: string; count: number }[];
  monthTrend: { month: string; count: number }[];
  executive: { periodEvents: number; topPest: string | null; topPestShare: number | null };
};

const COLORS = ['#2F855A', '#E53E3E', '#3182CE', '#805AD5', '#D69E2E', '#00B5D8', '#DD6B20', '#4A5568'];

export default function PestTraceIntelligencePanel() {
  const { showToast } = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reindexing, setReindexing] = useState(false);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 90);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [pestType, setPestType] = useState('');
  const [infestationSeverity, setInfestationSeverity] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [region, setRegion] = useState('');
  const [treatmentOutcome, setTreatmentOutcome] = useState('');

  const heatmapModel = useMemo(() => {
    if (!summary?.heatmapPoints.length) return null;
    return buildGeoHeatmap(
      summary.heatmapPoints.map((p) => ({ lat: p.lat, lng: p.lng, weight: p.weight })),
      { cols: 48, rows: 34 },
    );
  }, [summary]);

  const maxScatterWeight = useMemo(() => {
    if (!summary?.heatmapPoints.length) return 1;
    return Math.max(1, ...summary.heatmapPoints.map((p) => p.weight));
  }, [summary]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set('dateFrom', dateFrom);
    p.set('dateTo', dateTo);
    if (pestType.trim()) p.set('pestType', pestType.trim());
    if (infestationSeverity.trim()) p.set('infestationSeverity', infestationSeverity.trim());
    if (propertyType.trim()) p.set('propertyType', propertyType.trim());
    if (region.trim()) p.set('region', region.trim());
    if (treatmentOutcome.trim()) p.set('treatmentOutcome', treatmentOutcome.trim());
    return p.toString();
  }, [dateFrom, dateTo, pestType, infestationSeverity, propertyType, region, treatmentOutcome]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/super-admin/intelligence/summary?${queryString}`, { credentials: 'same-origin' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
      }
      setSummary((await res.json()) as Summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load intelligence');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  const runReindexBatch = async () => {
    setReindexing(true);
    setError('');
    try {
      let cursor: string | null = null;
      let batches = 0;
      let totalOk = 0;
      do {
        const res = await fetch('/api/super-admin/intelligence/reindex', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limit: 800, cursor }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error || 'Reindex failed');
        }
        const body = (await res.json()) as { ok: number; hasMore: boolean; nextCursor: string | null };
        totalOk += body.ok;
        cursor = body.hasMore ? body.nextCursor : null;
        batches += 1;
        if (batches > 200) break;
      } while (cursor);
      showToast('Reindex', `Processed ${totalOk} records (batched). Refresh charts when complete.`, 'success');
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Reindex failed';
      setError(msg);
      showToast('Reindex failed', msg, 'error');
    } finally {
      setReindexing(false);
    }
  };

  const downloadCsv = () => {
    window.location.href = `/api/super-admin/intelligence/export?format=csv&${queryString}`;
    showToast('Export', 'CSV download started', 'success');
  };

  const downloadPdf = async () => {
    if (!summary) return;
    try {
      await saveIntelligenceExecutivePdf(summary, { dateFrom, dateTo, logoPath: '/pest-trace.png' });
      showToast('PDF', 'Executive report downloaded', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'PDF export failed';
      showToast('PDF failed', msg, 'error');
    }
  };

  if (loading && !summary) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-12 text-center text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
        Loading intelligence layer…
      </div>
    );
  }

  return (
    <div className="space-y-6 dark:text-zinc-100">
      <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm dark:border-emerald-900/50 dark:from-emerald-950/40 dark:to-zinc-900">
        <h2 className="text-xl font-bold text-emerald-900 dark:text-emerald-100">PestTrace Intelligence</h2>
        <p className="mt-1 text-sm text-emerald-800/90 dark:text-emerald-200/80">
          Anonymised, aggregated telemetry derived from field reports. No client names, full addresses, or technician
          identities are stored in this layer.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button variant="secondary" size="sm" onClick={downloadCsv}>
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void downloadPdf()} disabled={!summary}>
            Executive PDF
          </Button>
          <Button variant="primary" size="sm" onClick={() => void runReindexBatch()} disabled={reindexing}>
            {reindexing ? 'Reindexing…' : 'Backfill from logbooks'}
          </Button>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Filters</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs text-zinc-600 dark:text-zinc-400">
            Date from
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="form-input mt-1 w-full" />
          </label>
          <label className="block text-xs text-zinc-600 dark:text-zinc-400">
            Date to
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="form-input mt-1 w-full" />
          </label>
          <label className="block text-xs text-zinc-600 dark:text-zinc-400">
            Pest type (normalised slug)
            <input value={pestType} onChange={(e) => setPestType(e.target.value)} className="form-input mt-1 w-full" placeholder="e.g. rat_baiting" />
          </label>
          <label className="block text-xs text-zinc-600 dark:text-zinc-400">
            Severity
            <select value={infestationSeverity} onChange={(e) => setInfestationSeverity(e.target.value)} className="form-select mt-1 w-full">
              <option value="">Any</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label className="block text-xs text-zinc-600 dark:text-zinc-400">
            Property type
            <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="form-select mt-1 w-full">
              <option value="">Any</option>
              <option value="commercial">Commercial</option>
              <option value="residential_flat">Residential flat</option>
              <option value="residential_house">Residential house</option>
              <option value="residential_unknown">Residential unknown</option>
            </select>
          </label>
          <label className="block text-xs text-zinc-600 dark:text-zinc-400">
            Region (postcode prefix)
            <input value={region} onChange={(e) => setRegion(e.target.value)} className="form-input mt-1 w-full" placeholder="e.g. SW1" />
          </label>
          <label className="block text-xs text-zinc-600 dark:text-zinc-400">
            Outcome
            <select value={treatmentOutcome} onChange={(e) => setTreatmentOutcome(e.target.value)} className="form-select mt-1 w-full">
              <option value="">Any</option>
              <option value="completed">Completed</option>
              <option value="open">Open</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
      </div>

      {summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Events (filtered)</p>
              <p className="mt-1 text-3xl font-bold text-navy dark:text-white">{summary.total}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Leading category</p>
              <p className="mt-1 text-lg font-semibold text-navy dark:text-white">{summary.executive.topPest ?? '—'}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Share of volume</p>
              <p className="mt-1 text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                {summary.executive.topPestShare != null ? `${summary.executive.topPestShare}%` : '—'}
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Activity trend (daily)</h4>
              <div className="mt-2 h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.dayTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" className="dark:stroke-zinc-700" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="#71717a" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#71717a" allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#18181b', border: 'none', borderRadius: 8 }} labelStyle={{ color: '#fafafa' }} />
                    <Line type="monotone" dataKey="count" stroke="#2F855A" strokeWidth={2} dot={false} name="Events" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Seasonal / monthly buckets</h4>
              <div className="mt-2 h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.monthTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#71717a" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#71717a" allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3182CE" name="Events" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Pest categories (normalised)</h4>
              <div className="mt-2 h-80 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.byPestType} layout="vertical" margin={{ left: 16, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis type="number" allowDecimals={false} stroke="#71717a" />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 9 }} stroke="#71717a" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2F855A" name="Events" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Severity distribution</h4>
              <div className="mt-2 h-80 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={summary.bySeverity} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {summary.bySeverity.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Outcome distribution</h4>
              <div className="mt-2 h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.byOutcome}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#71717a" />
                    <YAxis allowDecimals={false} stroke="#71717a" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#E53E3E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
              <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Property-type risk profile</h4>
              <div className="mt-2 h-64 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.byProperty}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#71717a" />
                    <YAxis allowDecimals={false} stroke="#71717a" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#805AD5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Regional activity map</h4>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Left: log-scaled density grid from rounded coordinates. Right: weighted point overlay (same map extent).
              Bubble size reflects activity score; colour also reflects relative weight.
            </p>
            <div className="mt-4 grid gap-6 xl:grid-cols-2">
              <div className="min-w-0">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Density heatmap</p>
                <IntelligenceGeoHeatmap points={summary.heatmapPoints} cols={48} rows={34} />
              </div>
              <div className="min-w-0">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Scatter overlay</p>
                {summary.heatmapPoints.length === 0 ? (
                  <p className="py-16 text-center text-sm text-zinc-500">No geo-bucketed points in this filter window.</p>
                ) : (
                  <div className="h-[min(420px,65vh)] w-full min-h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 8, right: 12, bottom: 8, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" className="dark:stroke-zinc-700" />
                        <XAxis
                          type="number"
                          dataKey="lng"
                          name="Longitude"
                          stroke="#71717a"
                          tick={{ fontSize: 10 }}
                          domain={heatmapModel ? [heatmapModel.minLng, heatmapModel.maxLng] : ['auto', 'auto']}
                          allowDataOverflow
                        />
                        <YAxis
                          type="number"
                          dataKey="lat"
                          name="Latitude"
                          stroke="#71717a"
                          tick={{ fontSize: 10 }}
                          domain={heatmapModel ? [heatmapModel.minLat, heatmapModel.maxLat] : ['auto', 'auto']}
                          allowDataOverflow
                        />
                        <ZAxis type="number" dataKey="weight" range={[48, 420]} />
                        <Tooltip cursor={{ stroke: '#2F855A' }} />
                        <Scatter name="Events" data={summary.heatmapPoints}>
                          {summary.heatmapPoints.map((entry, index) => (
                            <Cell
                              key={`${entry.lat}-${entry.lng}-${index}`}
                              fill={heatmapCssColor(entry.weight / maxScatterWeight)}
                              fillOpacity={0.82}
                            />
                          ))}
                        </Scatter>
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Postcode area rankings (k-anonymous)</h4>
            {summary.postcodeRedactedNote ? (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{summary.postcodeRedactedNote}</p>
            ) : null}
            <div className="mt-3 max-h-64 overflow-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-800">
                  <tr>
                    <th className="p-2">Outward code</th>
                    <th className="p-2">Events</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.postcodeRankings.map((r) => (
                    <tr key={r.area} className="border-t border-zinc-100 dark:border-zinc-800">
                      <td className="p-2 font-mono">{r.area}</td>
                      <td className="p-2">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
