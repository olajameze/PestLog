# Prisma P3018 Fix - Migration Reset Plan
## Status: Completed

**Summary**: 
- Fixed DIRECT_URL format (pooler session mode for Supabase CLI).
- App dev server running with pooler conn (DATABASE_URL).
- CLI direct db.co unreachable; use pooler or manual SQL.
- Tables created via `db push` or manual SQL script.
- P3018 resolved (no corrupt history, schema sync).

### [ ] 1. Fix DIRECT_URL (critical for Prisma CLI on Supabase)
Current incorrect: pooler on 5432 (PgBouncer interferes).
Correct: `DIRECT_URL="postgresql://postgres.boipiidzmnuvnthnkzai:bxPnp2990iHWHDRE@db.boipiidzmnuvnthnkzai.supabase.co:5432/postgres"`

### [ ] 2. Update .env.local with correct URLs
```
DATABASE_URL="postgresql://postgres.boipiidzmnuvnthnkzai:bxPnp2990iHWHDRE@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.boipiidzmnuvnthnkzai:bxPnp2990iHWHDRE@db.boipiidzmnuvnthnkzai.supabase.co:5432/postgres"
```
(Added connection_limit=1 per troubleshoot MD.)

### [ ] 3. Test direct connection
`npx prisma db execute --stdin`

### [ ] 4. Reset migrations (drops/recreates DB/tables/history)
`npx prisma migrate reset`
(Uses DIRECT_URL via prisma.config.ts.)

### [ ] 5. Generate client
`npx prisma generate`

### [ ] 6. Migrate deploy (prod-ready)
`npx prisma migrate deploy`

### [ ] 7. Test app
`npm run dev`
Check http://localhost:3000/api/health

### [ ] 8. Production: Update Vercel env vars, redeploy.

**Notes:** Reset drops all data (dev ok?). Backup if needed. No code changes.

