import { config } from "dotenv";
import { defineConfig } from "prisma/config";
import { normalizePostgresUrlForPrisma } from "./lib/normalizePostgresUrl";

// Explicitly load .env.local for local development
config({ path: '.env.local' });

// CLI operations require a direct, non-pooled connection to avoid prepared statement errors from PgBouncer.
const databaseUrl = normalizePostgresUrlForPrisma(process.env.DIRECT_URL || process.env.DATABASE_URL || '');

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    path: "prisma/migrations",
  },
});
