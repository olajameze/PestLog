import type { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';
import { isSuperAdminRequest } from '../../../../lib/superAdminRequestGuard';
import { prisma } from '../../../../lib/prisma';
import { writeIntelligenceAudit } from '../../../../lib/intelligence/writeIntelligenceAudit';

function parseDate(s: string | undefined, fallback: Date): Date {
  if (!s) return fallback;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isSuperAdminRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const format = typeof req.query.format === 'string' ? req.query.format.toLowerCase() : 'csv';
  if (format !== 'csv') {
    return res.status(400).json({ error: 'Only format=csv is supported for server export.' });
  }

  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 90);
  const dateFrom = parseDate(typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined, defaultFrom);
  const dateTo = parseDate(typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined, now);

  const pestType =
    typeof req.query.pestType === 'string' && req.query.pestType.trim() ? req.query.pestType.trim() : undefined;
  const infestationSeverity =
    typeof req.query.infestationSeverity === 'string' && req.query.infestationSeverity.trim()
      ? req.query.infestationSeverity.trim()
      : undefined;
  const propertyType =
    typeof req.query.propertyType === 'string' && req.query.propertyType.trim() ? req.query.propertyType.trim() : undefined;
  const region =
    typeof req.query.region === 'string' && req.query.region.trim() ? req.query.region.trim() : undefined;
  const treatmentOutcome =
    typeof req.query.treatmentOutcome === 'string' && req.query.treatmentOutcome.trim()
      ? req.query.treatmentOutcome.trim()
      : undefined;

  const where: Prisma.IntelligencePestEventWhereInput = {
    occurredAt: { gte: dateFrom, lte: dateTo },
    ...(pestType ? { pestType } : {}),
    ...(infestationSeverity ? { infestationSeverity } : {}),
    ...(propertyType ? { propertyType } : {}),
    ...(region ? { postcodeArea: { startsWith: region.toUpperCase().replace(/\s+/g, '') } } : {}),
    ...(treatmentOutcome ? { treatmentOutcome } : {}),
  };

  const rows = await prisma.intelligencePestEvent.findMany({
    where,
    select: {
      occurredAt: true,
      pestType: true,
      infestationSeverity: true,
      propertyType: true,
      postcodeArea: true,
      geoLatRounded: true,
      geoLngRounded: true,
      treatmentMethod: true,
      treatmentOutcome: true,
      revisitRequired: true,
      activityScore: true,
      season: true,
      treatmentEffectiveness: true,
      environmentalRiskScore: true,
    },
    orderBy: { occurredAt: 'desc' },
    take: Math.min(50_000, Number(req.query.limit) && Number(req.query.limit) > 0 ? Math.floor(Number(req.query.limit)) : 25_000),
  });

  const header = [
    'occurred_at',
    'pest_type',
    'infestation_severity',
    'property_type',
    'postcode_area',
    'geo_lat_rounded',
    'geo_lng_rounded',
    'treatment_method',
    'treatment_outcome',
    'revisit_required',
    'activity_score',
    'season',
    'treatment_effectiveness',
    'environmental_risk_score',
  ].join(',');

  function escCell(v: string | number | boolean | null | undefined): string {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  const lines = rows.map((r) =>
    [
      r.occurredAt.toISOString(),
      r.pestType,
      r.infestationSeverity,
      r.propertyType,
      r.postcodeArea ?? '',
      r.geoLatRounded ?? '',
      r.geoLngRounded ?? '',
      r.treatmentMethod,
      r.treatmentOutcome,
      r.revisitRequired,
      r.activityScore,
      r.season ?? '',
      r.treatmentEffectiveness ?? '',
      r.environmentalRiskScore ?? '',
    ].map(escCell).join(','),
  );

  await writeIntelligenceAudit('intelligence_export_csv', {
    rowCount: rows.length,
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  });

  const body = [header, ...lines].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="pesttrace-intelligence-${dateFrom.toISOString().slice(0, 10)}.csv"`);
  return res.status(200).send(body);
}
