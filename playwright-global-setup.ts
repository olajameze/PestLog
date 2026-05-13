import { execSync } from 'node:child_process';

/**
 * Ensures new tables (suggestions, maintenance, etc.) exist before Playwright hits the app.
 * Ignores failures so local runs without DB still execute smoke tests that skip DB.
 */
export default function globalSetup() {
  try {
    execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
  } catch {
    console.warn('[playwright globalSetup] prisma migrate deploy failed — DB-backed tests may fail.');
  }
}
