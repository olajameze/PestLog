import type { NextApiRequest, NextApiResponse } from 'next';
import { isSuperAdminRequest } from '../../../../lib/superAdminRequestGuard';
import { prisma } from '../../../../lib/prisma';
import { ingestLogbookEntryForIntelligence } from '../../../../lib/intelligence/ingestLogbookEntry';
import { writeIntelligenceAudit } from '../../../../lib/intelligence/writeIntelligenceAudit';

const MAX_BATCH = 2000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!isSuperAdminRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const rawLimit = typeof req.body?.limit === 'number' ? req.body.limit : Number(req.body?.limit);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(MAX_BATCH, Math.floor(rawLimit)) : 500;
  const cursor =
    typeof req.body?.cursor === 'string' && req.body.cursor.trim().length > 0 ? req.body.cursor.trim() : null;

  const entries = await prisma.logbookEntry.findMany({
    select: { id: true },
    orderBy: { id: 'asc' },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  let ok = 0;
  let failed = 0;
  for (const e of entries) {
    try {
      await ingestLogbookEntryForIntelligence(e.id);
      ok += 1;
    } catch {
      failed += 1;
    }
  }

  const nextCursor = entries.length > 0 ? entries[entries.length - 1]!.id : null;
  const hasMore = entries.length === limit;

  await writeIntelligenceAudit('intelligence_reindex_batch', {
    requested: limit,
    ok,
    failed,
    nextCursor,
    hasMore,
  });

  return res.status(200).json({
    processed: entries.length,
    ok,
    failed,
    nextCursor,
    hasMore,
  });
}
