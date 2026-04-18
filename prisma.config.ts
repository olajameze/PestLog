import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Explicitly load .env.local for local development
config({ path: '.env.local' });

// Force the correct URLs to avoid conflicts with local dev tools
// Use pooled URL for Prisma CLI operations (works despite prepared statement warnings)
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    path: "prisma/migrations",
  },
});
