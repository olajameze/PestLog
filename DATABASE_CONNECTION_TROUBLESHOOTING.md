# Database Connection Troubleshooting Guide

## Issue
Production site (www.pesttrace.com) is getting "Can't reach database server" errors:
- Error code: P1001
- Database: db.ozmqpbouelfinhpzcfvs.supabase.co (Supabase)
- Status: Working last night, failed today

### Error P3018: Migration History Out of Sync
If you see "Table LogbookEntry does not exist" during migration reset, your migration history is corrupted or a base migration is missing.

## Quick Diagnosis Checklist

### 1. **Verify Environment Variables in Vercel Dashboard**
```
Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
```

Check that these variables are set:
- ✅ `DATABASE_URL` - Should be your Supabase pooler connection string
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- ✅ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Your Supabase anon key
- ✅ `DIRECT_URL` - **CRITICAL** for migrations. Use the non-pooled connection (Port 5432).

**Important:** The DATABASE_URL must include:
```
?pgbouncer=true&connection_limit=1
```

Example format:
```
postgres://postgres.ozmqpbouelfinhpzcfvs:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

### 2. **Check Supabase Database Status**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Check the database health in the Dashboard

Look for:
- ⚠️ Service disruptions or maintenance
- 🔴 Database offline
- ⏱️ Connection pool exhaustion

### 3. **Verify Network Connectivity**
The error might be from:
- **Firewall blocking Vercel → Supabase**
- **Supabase IP whitelist**
- **Network timeout**

### 4. **Check Connection Pool Settings**
Recent changes (now applied):
- Connection timeout: 10000ms (was 2000ms) ✅
- Max connections: 2 (optimized for serverless) ✅
- Statement timeout: 30000ms ✅

### 5. **Immediate Actions to Take**

**Option A: Restart the Application**
- Go to Vercel Dashboard
- Click "Redeploy" on your production deployment
- This will reconnect to the database fresh

**Option B: Check Supabase Connection Pool**
1. Go to Supabase Dashboard
2. SQL Editor
3. Run: `SELECT count(*) FROM pg_stat_activity;`
4. If connections are maxed out, increase connection limit or restart

**Option C: Verify DATABASE_URL Locally**
```bash
# Test the connection string from .env.local
npx prisma db execute --stdin < /dev/null
```

## Common Causes and Solutions

| Symptom | Cause | Solution |
|---------|-------|----------|
| "Can't reach database server" | Environment variable not set in Vercel | Add DATABASE_URL to Vercel Environment Variables |
| Works locally but fails in production | Different DATABASE_URL in production | Ensure production URL has `pgbouncer=true` |
| Intermittent failures | Connection pool exhausted | Increase connection timeout (done) or reduce max connections |
| Persistent timeout | Supabase database down | Check Supabase status page |
| Suddenly stopped working | Supabase maintenance | Check service status or wait for maintenance to complete |

## Next Steps

1. **Verify DATABASE_URL is set in Vercel** - Most likely cause
2. **Redeploy application** - Fresh connection attempt
3. **Check Supabase dashboard** - Verify database is running
4. **Review recent changes** - Any recent Supabase updates or maintenance?
5. **Check Vercel logs** - For more detailed error information

## Contact Support
If the issue persists:
- **Supabase Support**: https://app.supabase.com/support
- **Vercel Support**: https://vercel.com/help
- Check status pages:
  - https://status.supabase.com
  - https://www.vercel-status.com

## Recent Changes Made
- ✅ Increased connection timeout from 2s to 10s
- ✅ Added statement timeout of 30s
- ✅ Adjusted max connections to 2 (optimal for serverless)
- ✅ Fixed import path error in API routes
