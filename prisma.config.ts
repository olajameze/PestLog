import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Explicitly load .env.local for local development
config({ path: '.env.local' });

// Force the correct URLs to avoid conflicts with local dev tools
// CLI operations like 'db pull' and 'db push' require a direct, non-pooled connection (port 5432) 
// to avoid prepared statement errors from PgBouncer.
const databaseUrl = process.env.DIRECT_URL || '';

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
  migrations: {
    path: "prisma/migrations",
  },
});
 
