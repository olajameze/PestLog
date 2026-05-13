import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma';

/**
 * Persist unexpected errors for super-admin review. Never throws.
 */
export async function logServerExceptionToDb(
  message: string,
  stack?: string,
  context?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.errorLog.create({
      data: {
        message: message.slice(0, 8000),
        stack: stack ? stack.slice(0, 32000) : null,
        context: context ? (context as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch {
    /* ignore logging failures */
  }
}
