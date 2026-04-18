import "dotenv/config";
import { defineConfig } from "prisma/config";

// Explicitly load .env.local for local development
require('dotenv').config({ path: '.env.local' });

// Force the correct URLs to avoid conflicts with local dev tools
const databaseUrl = "postgres://postgres.ozmqpbouelfinhpzcfvs:MissShabbat1962%23@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1";
const directUrl = "postgresql://postgres.ozmqpbouelfinhpzcfvs:MissShabbat1962%23@db.ozmqpbouelfinhpzcfvs.supabase.co:5432/postgres?sslmode=require";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
    directUrl: directUrl,
  },
});
