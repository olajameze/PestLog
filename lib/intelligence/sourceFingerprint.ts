import { createHmac } from 'crypto';

/**
 * Stable one-way id for (companyId, entryId) so we can upsert intelligence rows without storing raw IDs in analytics tables.
 */
export function buildSourceFingerprint(companyId: string, entryId: string): string {
  const secret =
    process.env.INTELLIGENCE_SOURCE_SECRET?.trim() ||
    process.env.SUPER_ADMIN_SESSION_SECRET?.trim() ||
    'pesttrace-intelligence-dev-only';
  return createHmac('sha256', secret).update(`${companyId}:${entryId}`).digest('hex');
}
