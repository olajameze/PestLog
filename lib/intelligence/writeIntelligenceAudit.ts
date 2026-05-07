import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma';

export async function writeIntelligenceAudit(action: string, detail?: Record<string, unknown>): Promise<void> {
  await prisma.intelligenceAuditLog.create({
    data: {
      action,
      detail: (detail ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}
