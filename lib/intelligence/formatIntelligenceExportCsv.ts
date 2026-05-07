import { queryIntelligenceSummary } from './queryIntelligenceSummary';
import { buildGeoHeatmap } from './geoHeatmap';

type Summary = Awaited<ReturnType<typeof queryIntelligenceSummary>>;

export type IntelligenceDetailRow = {
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
  activityScore: number;
  season: string | null;
  treatmentEffectiveness: string | null;
  environmentalRiskScore: number | null;
};

function escCell(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function line(cells: (string | number | boolean | null | undefined)[]): string {
  return cells.map(escCell).join(',');
}

/** Multi-section CSV optimised for Excel (UTF-8 BOM, title blocks, human headers). */
export function formatIntelligenceExportCsv(args: {
  summary: Summary;
  detailRows: IntelligenceDetailRow[];
  dateFrom: Date;
  dateTo: Date;
  generatedAt: Date;
  filterNote: string;
}): string {
  const { summary, detailRows, dateFrom, dateTo, generatedAt, filterNote } = args;
  const lines: string[] = [];

  lines.push(line(['PestTrace Intelligence Export']));
  lines.push(line(['Document', 'Anonymised telemetry — super-admin export']));
  lines.push(line(['Generated at (UTC)', generatedAt.toISOString()]));
  lines.push(line(['Reporting period from', dateFrom.toISOString()]));
  lines.push(line(['Reporting period to', dateTo.toISOString()]));
  lines.push(line(['Active filters', filterNote || 'None']));
  lines.push(line([]));

  lines.push(line(['=== EXECUTIVE SUMMARY ===']));
  lines.push(line(['Metric', 'Value']));
  lines.push(line(['Events in scope (aggregated count)', summary.total]));
  lines.push(line(['Leading pest category', summary.executive.topPest ?? '']));
  lines.push(line(['Leading category share (%)', summary.executive.topPestShare ?? '']));
  if (summary.postcodeRedactedNote) {
    lines.push(line(['Postcode note', summary.postcodeRedactedNote]));
  }
  lines.push(line([]));

  const heatPoints = detailRows
    .filter((r) => r.geoLatRounded != null && r.geoLngRounded != null)
    .map((r) => ({
      lat: r.geoLatRounded as number,
      lng: r.geoLngRounded as number,
      weight: r.activityScore,
    }));
  const heat = buildGeoHeatmap(heatPoints, { cols: 24, rows: 18, useUkFallbackExtent: true });
  lines.push(line(['=== GEO HEATMAP (EXPORT SAMPLE) ===']));
  lines.push(line(['Description', 'Intensity grid from exported rows with coordinates (sample cap may apply)']));
  lines.push(line(['Bins with activity', heat?.bins.length ?? 0]));
  lines.push(line(['Grid columns', heat?.cols ?? '']));
  lines.push(line(['Grid rows', heat?.rows ?? '']));
  lines.push(line(['Latitude min (model)', heat != null ? heat.minLat : '']));
  lines.push(line(['Latitude max (model)', heat != null ? heat.maxLat : '']));
  lines.push(line(['Longitude min (model)', heat != null ? heat.minLng : '']));
  lines.push(line(['Longitude max (model)', heat != null ? heat.maxLng : '']));
  if (heat && heat.bins.length > 0) {
    lines.push(line([]));
    lines.push(
      line([
        'Detail export — Grid i',
        'Grid j',
        'Intensity',
        'Point count',
        'Weight sum',
        'Lat min',
        'Lat max',
        'Lng min',
        'Lng max',
      ]),
    );
    const sortedDetail = [...heat.bins].sort((a, b) => b.weightSum - a.weightSum).slice(0, 80);
    for (const b of sortedDetail) {
      lines.push(
        line([
          b.i,
          b.j,
          Math.round(b.intensity * 1000) / 1000,
          b.pointCount,
          Math.round(b.weightSum * 100) / 100,
          Math.round(b.latMin * 1e4) / 1e4,
          Math.round(b.latMax * 1e4) / 1e4,
          Math.round(b.lngMin * 1e4) / 1e4,
          Math.round(b.lngMax * 1e4) / 1e4,
        ]),
      );
    }
  }
  lines.push(line([]));
  const sampleHeat = buildGeoHeatmap(
    summary.heatmapPoints.map((p) => ({ lat: p.lat, lng: p.lng, weight: p.weight })),
    { cols: 24, rows: 18, useUkFallbackExtent: true },
  );
  lines.push(line(['=== HEATMAP GRID (FROM GEO SAMPLE IN SUMMARY) ===']));
  lines.push(
    line([
      'Note',
      'Bins are derived from the same rounded geo sample used on the dashboard (not the full detail row limit).',
    ]),
  );
  lines.push(line([]));
  if (sampleHeat && sampleHeat.bins.length > 0) {
    lines.push(
      line([
        'Grid i',
        'Grid j',
        'Intensity',
        'Point count',
        'Weight sum',
        'Lat min',
        'Lat max',
        'Lng min',
        'Lng max',
      ]),
    );
    const sorted = [...sampleHeat.bins].sort((a, b) => b.weightSum - a.weightSum).slice(0, 100);
    for (const b of sorted) {
      lines.push(
        line([
          b.i,
          b.j,
          Math.round(b.intensity * 1000) / 1000,
          b.pointCount,
          Math.round(b.weightSum * 100) / 100,
          Math.round(b.latMin * 1e4) / 1e4,
          Math.round(b.latMax * 1e4) / 1e4,
          Math.round(b.lngMin * 1e4) / 1e4,
          Math.round(b.lngMax * 1e4) / 1e4,
        ]),
      );
    }
  } else {
    lines.push(line(['No bins', '']));
  }
  lines.push(line([]));

  lines.push(line(['=== PEST TYPE BREAKDOWN ===']));
  lines.push(line(['Pest type (normalised)', 'Event count']));
  for (const row of summary.byPestType.slice(0, 50)) {
    lines.push(line([row.name, row.count]));
  }
  lines.push(line([]));

  lines.push(line(['=== TREATMENT OUTCOME ===']));
  lines.push(line(['Outcome', 'Event count']));
  for (const row of summary.byOutcome) {
    lines.push(line([row.name, row.count]));
  }
  lines.push(line([]));

  lines.push(line(['=== INFESTATION SEVERITY ===']));
  lines.push(line(['Severity', 'Event count']));
  for (const row of summary.bySeverity) {
    lines.push(line([row.name, row.count]));
  }
  lines.push(line([]));

  lines.push(line(['=== PROPERTY TYPE ===']));
  lines.push(line(['Property type', 'Event count']));
  for (const row of summary.byProperty) {
    lines.push(line([row.name, row.count]));
  }
  lines.push(line([]));

  lines.push(line(['=== POSTCODE AREA RANKINGS (K-ANONYMOUS) ===']));
  lines.push(line(['Outward code', 'Event count']));
  for (const row of summary.postcodeRankings) {
    lines.push(line([row.area, row.count]));
  }
  lines.push(line([]));

  lines.push(line(['=== DAILY TREND (COUNTS) ===']));
  lines.push(line(['Day', 'Event count']));
  for (const row of summary.dayTrend) {
    lines.push(line([row.day, row.count]));
  }
  lines.push(line([]));

  lines.push(line(['=== MONTHLY TREND (COUNTS) ===']));
  lines.push(line(['Month', 'Event count']));
  for (const row of summary.monthTrend) {
    lines.push(line([row.month, row.count]));
  }
  lines.push(line([]));

  lines.push(line(['=== EVENT-LEVEL DETAIL ===']));
  lines.push(
    line([
      'Occurred At (UTC)',
      'Pest Type',
      'Infestation Severity',
      'Property Type',
      'Postcode Area',
      'Latitude (rounded)',
      'Longitude (rounded)',
      'Treatment Method',
      'Treatment Outcome',
      'Revisit Required',
      'Activity Score',
      'Season',
      'Treatment Effectiveness',
      'Environmental Risk Score',
    ]),
  );

  for (const r of detailRows) {
    lines.push(
      line([
        r.occurredAt.toISOString(),
        r.pestType,
        r.infestationSeverity,
        r.propertyType,
        r.postcodeArea,
        r.geoLatRounded,
        r.geoLngRounded,
        r.treatmentMethod,
        r.treatmentOutcome,
        r.revisitRequired,
        r.activityScore,
        r.season,
        r.treatmentEffectiveness,
        r.environmentalRiskScore,
      ]),
    );
  }

  return `\uFEFF${lines.join('\r\n')}`;
}
