import { extractUkPostcodeArea, getApproxLatLngForUkPostcodeOutcode } from './ukPostcodeGeo';

export {
  approxCoordsFromOutcode,
  extractUkPostcodeArea,
  getApproxLatLngForUkPostcodeOutcode,
  buildHeatmapPointsFromReportEntries,
} from './ukPostcodeGeo';

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

/** Map stored logbook `propertyType` to intelligence layer vocabulary; fall back to address inference. */
export function resolvePropertyTypeForIntelligence(stored: string | null | undefined, address: string): string {
  const s = stored?.trim().toLowerCase();
  if (s === 'residential_house' || s === 'house') return 'residential_house';
  if (s === 'residential_flat' || s === 'flat') return 'residential_flat';
  if (s === 'commercial') return 'commercial';
  if (s === 'agricultural') return 'agricultural';
  if (s === 'other' || s === 'mixed_use') return 'mixed_use';
  if (s && s.length > 0) return s.slice(0, 64);
  return inferPropertyType(address);
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
  postcode?: string | null;
  propertyType?: string | null;
  treatment: string;
  notes: string | null;
  status: string | null | undefined;
  followUpDate: Date | null | undefined;
  sourceFingerprint: string;
}): AnonymizedEventPayload {
  const postcodeBlob = params.postcode?.trim() ? params.postcode : params.address;
  const postcodeArea = extractUkPostcodeArea(postcodeBlob);
  const coords = getApproxLatLngForUkPostcodeOutcode(postcodeArea);
  const propertyType = resolvePropertyTypeForIntelligence(params.propertyType ?? null, params.address);
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
