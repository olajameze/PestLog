import { UK_POSTCODE_AREA_CENTROIDS } from './ukPostcodeAreaCentroids';

/** When outcode letters are not in the table, still place a coarse GB point (jittered). */
const GB_FALLBACK_CENTER: [number, number] = [54.702354, -3.276575];

function hashString32(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const ROUND_DECIMALS = 3;

export function roundCoord(n: number, decimals: number): number {
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

/** Leading 1–2 letters of a normalised UK outward code (e.g. SW1A → SW, B33 → B). */
export function postcodeAreaLettersFromOutcode(outcode: string): string {
  const u = outcode.toUpperCase().replace(/\s+/g, '');
  const m = u.match(/^([A-Z]{1,2})/);
  return m ? m[1] : '';
}

export function extractUkPostcodeArea(address: string): string | null {
  if (!address || typeof address !== 'string') return null;
  const normalized = address.toUpperCase().replace(/\s+/g, ' ').trim();
  const m = normalized.match(/\b([A-Z]{1,2}\d[A-Z0-9]?)(?:\s*\d[A-Z]{2})?\b/);
  if (!m) return null;
  return m[1];
}

/**
 * Approximate centroid for a UK outward code (district), using postcode-area centre + deterministic
 * jitter so neighbouring codes do not stack on one pixel.
 */
export function getApproxLatLngForUkPostcodeOutcode(outcode: string | null): { lat: number; lng: number } | null {
  if (!outcode) return null;
  const key = outcode.toUpperCase().replace(/\s+/g, '');
  if (!key) return null;
  const letters = postcodeAreaLettersFromOutcode(key);
  const base = letters ? UK_POSTCODE_AREA_CENTROIDS[letters] : undefined;
  const [lat0, lng0] = base ?? GB_FALLBACK_CENTER;
  const h = hashString32(key);
  const jLat = ((h % 1000) / 1000 - 0.5) * 0.14;
  const jLng = (((h >>> 10) % 1000) / 1000 - 0.5) * 0.18;
  return {
    lat: roundCoord(lat0 + jLat, ROUND_DECIMALS),
    lng: roundCoord(lng0 + jLng, ROUND_DECIMALS),
  };
}

/** @deprecated Alias — use `getApproxLatLngForUkPostcodeOutcode`. */
export function approxCoordsFromOutcode(outcode: string | null): { lat: number; lng: number } | null {
  return getApproxLatLngForUkPostcodeOutcode(outcode);
}

export type ReportEntryGeoInput = { id: string; address: string; postcode?: string | null };

/** Logbook rows → heatmap inputs (Business / Enterprise reports). */
export function buildHeatmapPointsFromReportEntries(
  entries: ReportEntryGeoInput[],
): Array<{ lat: number; lng: number; weight: number }> {
  const out: Array<{ lat: number; lng: number; weight: number }> = [];
  for (const e of entries) {
    const blob = e.postcode?.trim() ? e.postcode : e.address;
    const area = extractUkPostcodeArea(blob);
    if (!area) continue;
    const base = getApproxLatLngForUkPostcodeOutcode(area);
    if (!base) continue;
    const h = hashString32(e.id);
    out.push({
      lat: roundCoord(base.lat + ((h % 9) - 4) * 0.003, 4),
      lng: roundCoord(base.lng + (((h >>> 6) % 9) - 4) * 0.004, 4),
      weight: 1,
    });
  }
  return out;
}
