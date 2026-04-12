/**
 * Supabase's transaction pooler (PgBouncer, port 6543) does not support Prisma's
 * default named prepared statements. Pooler URLs must include `pgbouncer=true`.
 * @see https://supabase.com/docs/guides/database/prisma
 */
export function normalizePostgresUrlForPrisma(connectionString: string): string {
  try {
    const u = new URL(connectionString);
    const looksLikePooler =
      u.port === '6543' || u.hostname.includes('pooler.supabase.com');
    if (looksLikePooler && !u.searchParams.get('pgbouncer')) {
      u.searchParams.set('pgbouncer', 'true');
    }
    return u.toString();
  } catch {
    return connectionString;
  }
}
