'use client';

import { useMemo, type ReactNode } from 'react';
import { buildGeoHeatmap, heatmapCssColor } from '../../lib/intelligence/geoHeatmap';

export type HeatmapPoint = { lat: number; lng: number; weight: number };

type Props = {
  points: HeatmapPoint[];
  /** Chart resolution; higher = sharper map, heavier SVG. */
  cols?: number;
  rows?: number;
};

/**
 * SVG density heatmap (log-scaled activity). North-up; matches scatter extent when used together.
 */
export default function IntelligenceGeoHeatmap({ points, cols = 48, rows = 34 }: Props) {
  const model = useMemo(() => {
    const pts = points.map((p) => ({
      lat: p.lat,
      lng: p.lng,
      weight: Number.isFinite(p.weight) ? p.weight : 0,
    }));
    return buildGeoHeatmap(pts, { cols, rows, useUkFallbackExtent: true });
  }, [points, cols, rows]);

  const binLookup = useMemo(() => {
    if (!model?.bins.length) return null;
    const m = new Map<string, (typeof model.bins)[number]>();
    for (const b of model.bins) {
      m.set(`${b.i},${b.j}`, b);
    }
    return m;
  }, [model]);

  if (!model || model.bins.length === 0 || !binLookup) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
        No geo-bucketed points for density map in this range.
      </div>
    );
  }

  const { cols: gc, rows: gr, minLat, maxLat, minLng, maxLng } = model;

  const rects: ReactNode[] = [];
  for (let jr = 0; jr < gr; jr += 1) {
    for (let i = 0; i < gc; i += 1) {
      const j = gr - 1 - jr;
      const bin = binLookup.get(`${i},${j}`);
      const fill = bin ? heatmapCssColor(bin.intensity) : 'rgb(250,250,250)';
      rects.push(
        <rect
          key={`${i}-${jr}`}
          x={i}
          y={jr}
          width={1.001}
          height={1.001}
          fill={fill}
          stroke="rgba(244,244,245,0.9)"
          strokeWidth={0.015}
        />,
      );
    }
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-950">
        <svg
          viewBox={`0 0 ${gc} ${gr}`}
          className="aspect-[1.35/1] w-full max-h-[min(440px,70vh)] text-[10px]"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Geographic activity heatmap: relative intensity by grid cell"
        >
          {rects}
        </svg>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <span className="font-medium text-zinc-600 dark:text-zinc-300">Intensity</span>
          <div
            className="h-2 min-w-[140px] flex-1 rounded-full border border-zinc-200 sm:max-w-xs dark:border-zinc-600"
            style={{
              background:
                'linear-gradient(90deg, rgb(47,133,90) 0%, rgb(214,158,46) 50%, rgb(229,62,62) 100%)',
            }}
          />
          <span className="whitespace-nowrap">Low → high (log-scaled weight)</span>
        </div>
        <p className="font-mono text-[10px] text-zinc-500">
          Lat {minLat.toFixed(2)}°–{maxLat.toFixed(2)}° · Lng {minLng.toFixed(2)}°–{maxLng.toFixed(2)}°
        </p>
      </div>
    </div>
  );
}
