import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
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

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Allow self-signed certs for Supabase
});

const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;