import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

export type SearchHit =
  | { type: 'logbook_entry'; id: string; title: string; subtitle: string; date?: string };

export async function searchAll(prisma: PrismaClient, companyId: string, query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  const like = `%${q}%`;

  const rows = await prisma.$queryRaw<Array<{ id: string; clientName: string; address: string; date: Date }>>(
    Prisma.sql`
      SELECT "id", "clientName", "address", "date"
      FROM "LogbookEntry"
      WHERE "companyId" = ${companyId}
        AND ("clientName" ILIKE ${like} OR "address" ILIKE ${like} OR "treatment" ILIKE ${like})
      ORDER BY "date" DESC
      LIMIT 25
    `,
  );

  return rows.map((row) => ({
    type: 'logbook_entry',
    id: row.id,
    title: row.clientName,
    subtitle: row.address,
    date: row.date.toISOString(),
  }));
}

