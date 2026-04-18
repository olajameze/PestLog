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
  // Supabase pooled connections require specific SSL settings
  ssl: {
    rejectUnauthorized: false, // Required for Supabase pooled connections
  },
  // Connection pool settings for Vercel serverless
  max: 1, // Limit connections for serverless
  min: 0,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter,
  // Disable query logging in production for performance
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;