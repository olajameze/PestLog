import type { NextApiRequest, NextApiResponse } from 'next';
import { isSuperAdminRequest } from '../../../../lib/superAdminRequestGuard';
import { prisma } from '../../../../lib/prisma';
import { writeIntelligenceAudit } from '../../../../lib/intelligence/writeIntelligenceAudit';

/**
 * Clears all aggregated rows in `intelligence_pest_event` (anonymised layer only).
 * Does not delete logbook entries. Re-running "Backfill from logbooks" will repopulate from all logbooks.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isSuperAdminRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const confirm =
    typeof req.body?.confirm === 'string'
      ? req.body.confirm.trim().toUpperCase()
      : typeof req.query.confirm === 'string'
        ? req.query.confirm.trim().toUpperCase()
        : '';
  if (confirm !== 'RESET') {
    return res.status(400).json({
      error: 'Send JSON body { "confirm": "RESET" } to clear anonymised intelligence aggregates.',
    });
  }

  const deleted = await prisma.intelligencePestEvent.deleteMany({});

  await writeIntelligenceAudit('intelligence_reset', {
    deletedRows: deleted.count,
  });

  return res.status(200).json({
    ok: true,
    deletedRows: deleted.count,
  });
}
