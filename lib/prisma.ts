import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { normalizePostgresUrlForPrisma } from './normalizePostgresUrl';

const connectionString = process.env.POSTGRES_PRISMA_URL
  ? normalizePostgresUrlForPrisma(process.env.POSTGRES_PRISMA_URL)
  : undefined;
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  // Local/dev environments can be behind TLS-inspecting proxies that inject
  // self-signed certs and break Postgres TLS handshakes.
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

if (!connectionString) {
  throw new Error(
    'Missing database connection string. Set POSTGRES_PRISMA_URL in your .env file. For Prisma CLI (db push), also set POSTGRES_URL_NON_POOLING — see .env.example.',
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const pool = new Pool({
  connectionString,
  // Some local Windows/corporate networks inject TLS certificates.
  // Allowing unauthorized certs in development prevents local P1011 TLS failures.
  ssl:
    isProduction
      ? { rejectUnauthorized: true }
      : { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;