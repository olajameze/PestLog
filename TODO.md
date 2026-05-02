# Prisma P3018 Fix - Migration Reset Plan
## Status: Completed

**Summary**:
- Fixed DIRECT_URL format (pooler session mode for Supabase CLI).
- App dev server running with pooler conn (DATABASE_URL).
- CLI direct db.co unreachable; use pooler or manual SQL.
- Tables created via `db push` or manual SQL script.
- P3018 resolved (no corrupt history, schema sync).

**Security:** Never commit real passwords or connection strings. If credentials were ever committed, rotate the Supabase database password and service role key in the project dashboard, then update Vercel / `.env.local` only.

### [ ] 1. Fix DIRECT_URL (critical for Prisma CLI on Supabase)
Current incorrect: pooler on 5432 (PgBouncer interferes).
Correct pattern (replace placeholders with your project values):

`DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[YOUR_DB_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"`

### [ ] 2. Update .env.local with correct URLs
```
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[YOUR_DB_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[YOUR_DB_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
```
(Add `connection_limit=1` per [DATABASE_CONNECTION_TROUBLESHOOTING.md](DATABASE_CONNECTION_TROUBLESHOOTING.md).)

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

**Notes:** Reset drops all data (dev ok?). Backup if needed. See [.env.example](.env.example) for required variables.
