import "dotenv/config";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Explicitly load .env.local for local development
config({ path: '.env.local' });

// Force the correct URLs to avoid conflicts with local dev tools
// Use pooled URL for Prisma CLI operations (works despite prepared statement warnings)
const databaseUrl = "postgres://postgres.ozmqpbouelfinhpzcfvs:MissShabbat1962%23@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
