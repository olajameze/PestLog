import { PrismaClient } from '@prisma/client';
import { normalizePostgresUrlForPrisma } from './normalizePostgresUrl';

const connectionString = normalizePostgresUrlForPrisma(
  process.env.DATABASE_URL || ''
);

if (!connectionString) {
  throw new Error(
    'Missing DATABASE_URL environment variable. Set it in your .env file or Vercel dashboard.',
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;