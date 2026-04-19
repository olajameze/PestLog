# Production Database Connection - URGENT ACTION PLAN

**Status**: Database connectivity errors in production (www.pesttrace.com)

## ⚠️ IMMEDIATE ACTIONS (Do These First)

### 1. **Verify DATABASE_URL in Vercel** (Takes 2 minutes)
```
Steps:
1. Go to https://vercel.com/dashboard
2. Click your PestTrace project
3. Go to Settings → Environment Variables
4. Check that DATABASE_URL is set and contains:
   - ✅ postgres://
   - ✅ pgbouncer=true
   - ✅ connection_limit=1
   - ✅ Your actual password and Supabase host
```

**Expected value format:**
```
postgres://postgres.ozmqpbouelfinhpzcfvs:YOUR_PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

### 2. **Redeploy Your Application** (Takes 1 minute)
```
Steps:
1. Go to Vercel Dashboard
2. Select your production deployment
3. Click "Redeploy" button
4. Wait for deployment to complete
5. Test: Go to https://www.pesttrace.com/api/health
   - Should return JSON with status: "healthy"
```

### 3. **Check Supabase Status** (Takes 1 minute)
```
Steps:
1. Go to https://app.supabase.com
2. Select your project
3. Check Dashboard for any:
   - 🔴 Database offline status
   - ⚠️ Active incidents or maintenance
   - Connection pool issues
```

## 🔍 IF PROBLEM PERSISTS

### Check New Health Endpoint
```bash
# This endpoint will tell you exactly what's wrong
curl https://www.pesttrace.com/api/health

# Response shows:
{
  "status": "healthy" | "unhealthy",
  "database": {
    "connected": true/false,
    "latency": 123,
    "error": "connection details if failed"
  }
}
```

### Check Vercel Logs
```
1. Go to Vercel Dashboard
2. Select your project → Deployments
3. Click the failed deployment
4. View "Logs" tab for detailed errors
```

### Check Supabase Connection Pool
```
In Supabase Dashboard → SQL Editor, run:
SELECT count(*) as active_connections FROM pg_stat_activity;

If count > 10, you may have pool exhaustion
```

## 🔧 CHANGES MADE TO FIX THIS

✅ **Updated Connection Timeout Settings** (lib/prisma.ts)
- Increased connection timeout: 2s → 10s
- Added statement timeout: 30s
- Optimized pool size: 2 connections for serverless

✅ **Added Health Check Endpoint** (pages/api/health.ts)
- Test: `GET /api/health`
- Returns database connectivity status
- Useful for monitoring and debugging

✅ **Fixed Import Path** (pages/api/[id].ts)
- Corrected module import paths
- Build now passes without errors

✅ **Created Troubleshooting Guide** (DATABASE_CONNECTION_TROUBLESHOOTING.md)
- Comprehensive diagnosis steps
- Common causes and solutions

## 📞 SUPPORT CONTACTS

If issues persist, contact:
- **Supabase**: https://app.supabase.com/support
- **Vercel**: https://vercel.com/help

## ✅ SUCCESS INDICATORS

After following above steps:
- ✅ Page loads without 500 errors
- ✅ `/api/health` returns `"status": "healthy"`
- ✅ Dashboard loads with user data
- ✅ API endpoints respond normally

---

**Priority**: HIGH - Application is currently down in production
**Time to resolve**: 5-10 minutes if it's environment variables
**Complexity**: Medium - May require Supabase investigation if not env variables
