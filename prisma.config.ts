import "dotenv/config";
import { defineConfig } from "prisma/config";
import { normalizePostgresUrlForPrisma } from "./lib/normalizePostgresUrl";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: normalizePostgresUrlForPrisma(process.env.POSTGRES_URL_NON_POOLING || process.env.DIRECT_URL || process.env.DATABASE_URL || ""),
  },
});
