import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { logger } from '../logger';
import { buildSourceFingerprint } from './sourceFingerprint';
import { buildAnonymizedEventPayload } from './transformLogbookToEvent';

export async function ingestLogbookEntryForIntelligence(entryId: string): Promise<void> {
  const entry = await prisma.logbookEntry.findUnique({
    where: { id: entryId },
    select: {
      id: true,
      companyId: true,
      date: true,
      address: true,
      postcode: true,
      propertyType: true,
      treatment: true,
      notes: true,
      status: true,
      followUpDate: true,
    },
  });
  if (!entry) return;

  const fp = buildSourceFingerprint(entry.companyId, entry.id);
  const payload = buildAnonymizedEventPayload({
    companyId: entry.companyId,
    entryId: entry.id,
    date: entry.date,
    address: entry.address,
    postcode: entry.postcode,
    propertyType: entry.propertyType,
    treatment: entry.treatment,
    notes: entry.notes,
    status: entry.status,
    followUpDate: entry.followUpDate,
    sourceFingerprint: fp,
  });

  await prisma.intelligencePestEvent.upsert({
    where: { sourceFingerprint: fp },
    create: {
      sourceFingerprint: payload.sourceFingerprint,
      occurredAt: payload.occurredAt,
      pestType: payload.pestType,
      infestationSeverity: payload.infestationSeverity,
      propertyType: payload.propertyType,
      postcodeArea: payload.postcodeArea,
      geoLatRounded: payload.geoLatRounded,
      geoLngRounded: payload.geoLngRounded,
      treatmentMethod: payload.treatmentMethod,
      treatmentOutcome: payload.treatmentOutcome,
      revisitRequired: payload.revisitRequired,
      environmentalFactors: payload.environmentalFactors as Prisma.InputJsonValue,
      activityScore: payload.activityScore,
      season: payload.season,
      treatmentEffectiveness: payload.treatmentEffectiveness,
      environmentalRiskScore: payload.environmentalRiskScore,
    },
    update: {
      occurredAt: payload.occurredAt,
      pestType: payload.pestType,
      infestationSeverity: payload.infestationSeverity,
      propertyType: payload.propertyType,
      postcodeArea: payload.postcodeArea,
      geoLatRounded: payload.geoLatRounded,
      geoLngRounded: payload.geoLngRounded,
      treatmentMethod: payload.treatmentMethod,
      treatmentOutcome: payload.treatmentOutcome,
      revisitRequired: payload.revisitRequired,
      environmentalFactors: payload.environmentalFactors as Prisma.InputJsonValue,
      activityScore: payload.activityScore,
      season: payload.season,
      treatmentEffectiveness: payload.treatmentEffectiveness,
      environmentalRiskScore: payload.environmentalRiskScore,
    },
  });
}

export async function deleteIntelligenceForLogbookEntry(entryId: string, companyId: string): Promise<void> {
  const fp = buildSourceFingerprint(companyId, entryId);
  await prisma.intelligencePestEvent.deleteMany({ where: { sourceFingerprint: fp } });
}

export function scheduleIntelligenceIngest(entryId: string): void {
  void ingestLogbookEntryForIntelligence(entryId).catch((e) => {
    logger.warn(`[intelligence] ingest failed for ${entryId}: ${e instanceof Error ? e.message : String(e)}`);
  });
}
