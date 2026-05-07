import type { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';
import { isSuperAdminRequest } from '../../../../lib/superAdminRequestGuard';
import { prisma } from '../../../../lib/prisma';
import { writeIntelligenceAudit } from '../../../../lib/intelligence/writeIntelligenceAudit';
import { queryIntelligenceSummary, type IntelligenceQueryFilters } from '../../../../lib/intelligence/queryIntelligenceSummary';
import {
  formatIntelligenceExportCsv,
  type IntelligenceDetailRow,
} from '../../../../lib/intelligence/formatIntelligenceExportCsv';

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

  const filters: IntelligenceQueryFilters = {
    dateFrom,
    dateTo,
    pestType,
    infestationSeverity,
    propertyType,
    region,
    treatmentOutcome,
  };

  const [summary, rows] = await Promise.all([
    queryIntelligenceSummary(filters),
    prisma.intelligencePestEvent.findMany({
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
      take: Math.min(
        50_000,
        Number(req.query.limit) && Number(req.query.limit) > 0 ? Math.floor(Number(req.query.limit)) : 25_000,
      ),
    }),
  ]);

  const detailRows: IntelligenceDetailRow[] = rows.map((r) => ({
    occurredAt: r.occurredAt,
    pestType: r.pestType,
    infestationSeverity: r.infestationSeverity,
    propertyType: r.propertyType,
    postcodeArea: r.postcodeArea,
    geoLatRounded: r.geoLatRounded,
    geoLngRounded: r.geoLngRounded,
    treatmentMethod: r.treatmentMethod,
    treatmentOutcome: r.treatmentOutcome,
    revisitRequired: r.revisitRequired,
    activityScore: r.activityScore,
    season: r.season,
    treatmentEffectiveness: r.treatmentEffectiveness,
    environmentalRiskScore: r.environmentalRiskScore,
  }));

  const filterParts = [
    pestType ? `pest_type=${pestType}` : '',
    infestationSeverity ? `severity=${infestationSeverity}` : '',
    propertyType ? `property=${propertyType}` : '',
    region ? `region=${region}` : '',
    treatmentOutcome ? `outcome=${treatmentOutcome}` : '',
  ].filter(Boolean);
  const filterNote = filterParts.length ? filterParts.join('; ') : 'None';

  const body = formatIntelligenceExportCsv({
    summary,
    detailRows,
    dateFrom,
    dateTo,
    generatedAt: new Date(),
    filterNote,
  });

  await writeIntelligenceAudit('intelligence_export_csv', {
    rowCount: rows.length,
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="pesttrace-intelligence-report-${dateFrom.toISOString().slice(0, 10)}.csv"`,
  );
  return res.status(200).send(body);
}
