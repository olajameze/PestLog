/** Rough UK outcode → centroid (≈ district centre) for heatmap visuals — no address stored. */
const OUTCODE_CENTROIDS: Record<string, [number, number]> = {
  SW1A: [51.5014, -0.1419],
  EC1A: [51.5155, -0.0922],
  W1A: [51.5074, -0.1278],
  E1A: [51.5108, -0.074],
  M1: [53.4808, -2.2426],
  B1: [52.4862, -1.8904],
  L1: [53.4084, -2.9916],
  LS1: [53.8008, -1.5491],
  G1: [55.8642, -4.2518],
  EH1: [55.9533, -3.1883],
  CF10: [51.4816, -3.1791],
  BS1: [51.4545, -2.5879],
  OX1: [51.752, -1.2577],
  CB1: [52.2053, 0.1218],
  NR1: [52.6286, 1.2923],
};

function roundCoord(n: number, decimals: number): number {
  const p = 10 ** decimals;
  return Math.round(n * p) / p;
}

export function approxCoordsFromOutcode(outcode: string | null): { lat: number; lng: number } | null {
  if (!outcode) return null;
  const key = outcode.toUpperCase().replace(/\s+/g, '');
  const hit = OUTCODE_CENTROIDS[key];
  if (!hit) return null;
  return { lat: roundCoord(hit[0], 3), lng: roundCoord(hit[1], 3) };
}

export function extractUkPostcodeArea(address: string): string | null {
  if (!address || typeof address !== 'string') return null;
  const normalized = address.toUpperCase().replace(/\s+/g, ' ').trim();
  const m = normalized.match(/\b([A-Z]{1,2}\d[A-Z0-9]?)(?:\s*\d[A-Z]{2})?\b/);
  if (!m) return null;
  return m[1];
}

export function inferPropertyType(address: string): string {
  const a = address.toLowerCase();
  if (/\b(farm|industrial|warehouse|factory|office|retail|shop|store|hotel|motel|school|university|hospital|clinic|yard|depot)\b/.test(a)) {
    return 'commercial';
  }
  if (/\b(flat|apartment|apt|maisonette|unit\s*\d)\b/.test(a)) {
    return 'residential_flat';
  }
  if (/\b(house|bungalow|cottage|terrace|semi|detached)\b/.test(a)) {
    return 'residential_house';
  }
  return 'residential_unknown';
}

export function inferInfestationSeverity(treatment: string, notes: string | null, status: string | null): string {
  const blob = `${treatment} ${notes ?? ''} ${status ?? ''}`.toLowerCase();
  if (/\b(severe|heavy|major|serious|high)\b/.test(blob)) return 'high';
  if (/\b(moderate|medium|mid)\b/.test(blob)) return 'medium';
  if (/\b(light|low|minor|small)\b/.test(blob)) return 'low';
  return 'unknown';
}

export function normalizePestType(treatment: string): string {
  const t = treatment.trim().toLowerCase();
  if (!t) return 'unspecified';
  const compact = t.replace(/[^a-z0-9]+/g, '_').slice(0, 64);
  return compact || 'unspecified';
}

export function normalizeTreatmentMethod(treatment: string): string {
  return treatment.trim().slice(0, 200) || 'unspecified';
}

export function seasonFromDate(d: Date): string {
  const m = d.getUTCMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

export function treatmentOutcomeFromStatus(status: string | null | undefined): string {
  const s = (status ?? 'open').toLowerCase();
  if (s === 'completed') return 'completed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  return 'open';
}

export function treatmentEffectivenessFromSignals(params: {
  outcome: string;
  revisitRequired: boolean;
}): string {
  if (params.outcome === 'cancelled') return 'ineffective_or_aborted';
  if (params.outcome === 'open') return 'pending';
  if (params.revisitRequired) return 'partial_followup';
  return 'resolved_single_visit';
}

export function computeActivityScore(params: {
  severity: string;
  revisitRequired: boolean;
  notesLength: number;
}): number {
  const sev =
    params.severity === 'high' ? 40 : params.severity === 'medium' ? 25 : params.severity === 'low' ? 15 : 10;
  const revisit = params.revisitRequired ? 15 : 0;
  const churn = Math.min(35, Math.floor(params.notesLength / 8));
  return Math.min(100, 20 + sev + revisit + churn);
}

export function computeEnvironmentalRiskScore(params: { season: string; severity: string }): number {
  let score = 30;
  if (params.severity === 'high') score += 35;
  else if (params.severity === 'medium') score += 20;
  else if (params.severity === 'low') score += 10;
  if (params.season === 'winter' || params.season === 'summer') score += 10;
  return Math.min(100, score);
}

export type AnonymizedEventPayload = {
  sourceFingerprint: string;
  occurredAt: Date;
  pestType: string;
  infestationSeverity: string;
  propertyType: string;
  postcodeArea: string | null;
  geoLatRounded: number | null;
  geoLngRounded: number | null;
  treatmentMethod: string;
  treatmentOutcome: string;
  revisitRequired: boolean;
  environmentalFactors: Record<string, unknown>;
  activityScore: number;
  season: string;
  treatmentEffectiveness: string;
  environmentalRiskScore: number;
};

export function buildAnonymizedEventPayload(params: {
  companyId: string;
  entryId: string;
  date: Date;
  address: string;
  treatment: string;
  notes: string | null;
  status: string | null | undefined;
  followUpDate: Date | null | undefined;
  sourceFingerprint: string;
}): AnonymizedEventPayload {
  const postcodeArea = extractUkPostcodeArea(params.address);
  const coords = approxCoordsFromOutcode(postcodeArea);
  const propertyType = inferPropertyType(params.address);
  const infestationSeverity = inferInfestationSeverity(params.treatment, params.notes, params.status ?? null);
  const pestType = normalizePestType(params.treatment);
  const treatmentMethod = normalizeTreatmentMethod(params.treatment);
  const treatmentOutcome = treatmentOutcomeFromStatus(params.status);
  const revisitRequired = Boolean(params.followUpDate);
  const season = seasonFromDate(params.date);
  const treatmentEffectiveness = treatmentEffectivenessFromSignals({
    outcome: treatmentOutcome,
    revisitRequired,
  });
  const activityScore = computeActivityScore({
    severity: infestationSeverity,
    revisitRequired,
    notesLength: (params.notes ?? '').length,
  });
  const environmentalRiskScore = computeEnvironmentalRiskScore({ season, severity: infestationSeverity });

  return {
    sourceFingerprint: params.sourceFingerprint,
    occurredAt: params.date,
    pestType,
    infestationSeverity,
    propertyType,
    postcodeArea,
    geoLatRounded: coords?.lat ?? null,
    geoLngRounded: coords?.lng ?? null,
    treatmentMethod,
    treatmentOutcome,
    revisitRequired,
    environmentalFactors: {
      season,
      utcMonth: params.date.getUTCMonth() + 1,
    },
    activityScore,
    season,
    treatmentEffectiveness,
    environmentalRiskScore,
  };
}
