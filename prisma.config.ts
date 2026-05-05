import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Explicitly load .env.local for local development
config({ path: '.env.local' });

// Connection URL for Prisma CLI (migrate, db execute, db pull, etc.)
//
// Prefer direct Postgres (DIRECT_URL, port 5432) when your network allows it.
// If `prisma db execute` fails with P1001 (can't reach db.*.supabase.co:5432), set
// PRISMA_CLI_DATABASE_URL in .env.local to the same **pooler** URL as DATABASE_URL
// (port 6543, pgbouncer=true). Remove or unset PRISMA_CLI_DATABASE_URL before running
// `prisma migrate` in production if you hit pooler limitations.
const databaseUrl =
  process.env.PRISMA_CLI_DATABASE_URL?.trim() ||
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("WARNING: Neither DIRECT_URL nor DATABASE_URL is set. Prisma CLI may fail.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl ?? "",
  },
  migrations: {
    path: "prisma/migrations",
  },
});
 
