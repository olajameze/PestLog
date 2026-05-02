import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { normalizePostgresUrlForPrisma } from './normalizePostgresUrl';

const prismaClientSingleton = () => {
  // Prefer pooled DATABASE_URL at runtime (Supabase pooler + pgbouncer=true).
  // Use DIRECT_URL in prisma.config.ts for CLI/migrations only.
  const connectionString = normalizePostgresUrlForPrisma(
    process.env.DATABASE_URL || process.env.DIRECT_URL || '',
  );
  const pool = new Pool({ 
    connectionString,
    // Required for Supabase connections
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}