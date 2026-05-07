/**
 * Geo heatmap: aggregate rounded lat/lng points into a fixed grid for density visuals (UI, PDF).
 * Intensity uses log-scaled total activity weight for readable contrast.
 */

export type GeoHeatPoint = { lat: number; lng: number; weight: number };

export type HeatmapBin = {
  i: number;
  j: number;
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
  /** Normalised 0–1 for colouring */
  intensity: number;
  pointCount: number;
  weightSum: number;
};

export type GeoHeatmapModel = {
  cols: number;
  rows: number;
  bins: HeatmapBin[];
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  maxRawIntensity: number;
};

/** Approximate GB mainland + NI bounding box (°, padded queries still use data extent first). */
const UK_LAT_MIN = 49.5;
const UK_LAT_MAX = 60.95;
const UK_LNG_MIN = -8.8;
const UK_LNG_MAX = 2.1;

const PAD_RATIO = 0.08;

function extentWithPadding(
  points: GeoHeatPoint[],
  useUkFallback: boolean,
): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
  if (points.length === 0) {
    if (!useUkFallback) return null;
    return { minLat: UK_LAT_MIN, maxLat: UK_LAT_MAX, minLng: UK_LNG_MIN, maxLng: UK_LNG_MAX };
  }
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const p of points) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng);
    maxLng = Math.max(maxLng, p.lng);
  }
  if (!Number.isFinite(minLat)) return useUkFallback
    ? { minLat: UK_LAT_MIN, maxLat: UK_LAT_MAX, minLng: UK_LNG_MIN, maxLng: UK_LNG_MAX }
    : null;

  const latR = (maxLat - minLat) || 0.02;
  const lngR = (maxLng - minLng) || 0.02;
  const pLat = latR * PAD_RATIO;
  const pLng = lngR * PAD_RATIO;
  return {
    minLat: minLat - pLat,
    maxLat: maxLat + pLat,
    minLng: minLng - pLng,
    maxLng: maxLng + pLng,
  };
}

function clamp01(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t;
}

/** Green (low) → amber → red (high), matching PestTrace primary / emergency palette. */
export function heatmapRgb(intensity: number): { r: number; g: number; b: number } {
  const t = clamp01(intensity);
  if (t < 0.5) {
    const k = t / 0.5;
    return {
      r: Math.round(47 + (214 - 47) * k),
      g: Math.round(133 + (158 - 133) * k),
      b: Math.round(90 + (46 - 90) * k),
    };
  }
  const k = (t - 0.5) / 0.5;
  return {
    r: Math.round(214 + (229 - 214) * k),
    g: Math.round(158 + (62 - 158) * k),
    b: Math.round(46 + (62 - 46) * k),
  };
}

/** CSS `rgb(...)` string for SVG/HTML. */
export function heatmapCssColor(intensity: number): string {
  const { r, g, b } = heatmapRgb(intensity);
  return `rgb(${r},${g},${b})`;
}

/**
 * @param cols / rows — grid resolution (e.g. 36×28).
 */
export function buildGeoHeatmap(
  points: GeoHeatPoint[],
  opts?: { cols?: number; rows?: number; useUkFallbackExtent?: boolean },
): GeoHeatmapModel | null {
  const cols = opts?.cols ?? 36;
  const rows = opts?.rows ?? 28;
  const useUk = opts?.useUkFallbackExtent ?? true;

  const valid = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && Number.isFinite(p.weight));
  const ext = extentWithPadding(valid, useUk);
  if (!ext) return null;

  const { minLat, maxLat, minLng, maxLng } = ext;
  const latSpan = maxLat - minLat || 1e-6;
  const lngSpan = maxLng - minLng || 1e-6;

  const cellLng = lngSpan / cols;
  const cellLat = latSpan / rows;

  const gridW = new Float64Array(cols * rows);
  const gridC = new Uint32Array(cols * rows);

  for (const p of valid) {
    const i = Math.min(cols - 1, Math.max(0, Math.floor((p.lng - minLng) / cellLng)));
    const j = Math.min(rows - 1, Math.max(0, Math.floor((p.lat - minLat) / cellLat)));
    const idx = j * cols + i;
    gridW[idx] += Math.max(0, p.weight);
    gridC[idx] += 1;
  }

  let maxLog = 0;
  for (let idx = 0; idx < gridW.length; idx += 1) {
    if (gridC[idx] === 0) continue;
    maxLog = Math.max(maxLog, Math.log1p(gridW[idx]));
  }
  if (maxLog <= 0) maxLog = 1;

  const bins: HeatmapBin[] = [];
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < cols; i += 1) {
      const idx = j * cols + i;
      if (gridC[idx] === 0) continue;
      const latMin = minLat + j * cellLat;
      const latMax = latMin + cellLat;
      const lngMin = minLng + i * cellLng;
      const lngMax = lngMin + cellLng;
      const weightSum = gridW[idx];
      const intensity = Math.log1p(weightSum) / maxLog;
      bins.push({
        i,
        j,
        latMin,
        latMax,
        lngMin,
        lngMax,
        intensity: clamp01(intensity),
        pointCount: gridC[idx],
        weightSum,
      });
    }
  }

  return {
    cols,
    rows,
    bins,
    minLat,
    maxLat,
    minLng,
    maxLng,
    maxRawIntensity: maxLog,
  };
}
