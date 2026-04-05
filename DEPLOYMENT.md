# PestLog Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Create at [vercel.com](https://vercel.com)
2. **GitHub Account**: Repository must be pushed to GitHub
3. **Environment Variables**: All secrets ready to configure
4. **Database**: PostgreSQL instance (e.g., Supabase)

---

## Step 1: Prepare Environment Variables

Create a `.env.local` file or configure via Vercel dashboard. Required variables:

```bash
# Supabase (Auth & Storage)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Database (Prisma)
DATABASE_URL=postgresql://user:pass@server:5432/pestlog

# Stripe (Payments)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... # (optional for client-side)

# Deployment
NEXTAUTH_URL=https://jgdev.org
NODE_ENV=production
```

### Getting Credentials

**Supabase:**
- Go to Project Settings → API
- Copy `Project URL` and `Anon Public Key`

**Stripe:**
- Dashboard → Developers → API Keys
- Use Live Secret Key and Webhook Signing Secret
- Create webhook endpoint pointing to `https://jgdev.org/api/webhooks/stripe`

**Database:**
- Use Supabase's PostgreSQL connection string or external database
- Format: `postgresql://[user]:[password]@[host]:[port]/[database]`

---

## Step 2: Push Code to GitHub

```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

---

## Step 3: Deploy to Vercel

### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy project
vercel --prod

# When prompted:
# - Link to existing project or create new
# - Set environment variables when prompted
# - Confirm deployment
```

### Option B: Vercel Dashboard

1. Go to [vercel.com/import](https://vercel.com/import)
2. Select GitHub repository
3. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. Add environment variables:
   - Click "Environment Variables"
   - Paste all variables from `.env.local`
5. Click "Deploy"

---

## Step 4: Run Prisma Migrations on Production

After deployment, run migrations to set up database schema:

```bash
# From local machine with DATABASE_URL set to production database
npx prisma migrate deploy

# Check migration status
npx prisma migrate status
```

Or, if deploying with GitHub integration:
1. Add build script to `package.json`:
```json
{
  "scripts": {
    "build": "prisma migrate deploy && next build"
  }
}
```

2. Vercel will run this automatically on each deploy.

---

## Step 5: Configure Domain

### Option A: Custom Domain (jgdev.org)

1. In Vercel dashboard, go to **Settings → Domains**
2. Click "Add Domain"
3. Enter `jgdev.org`
4. Choose "Nameserver" or "CNAME" integration
5. Update DNS records at your domain registrar if needed

### Option B: Vercel Subdomain (auto-generated)

1. Default: `pestlog.vercel.app`
2. No additional configuration needed

---

## Step 6: Configure Stripe Webhook

In Stripe Dashboard:

1. Go to **Developers → Webhooks**
2. Click "Add endpoint"
3. Enter endpoint URL: `https://jgdev.org/api/webhooks/stripe`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy **Signing Secret** and add to environment variable `STRIPE_WEBHOOK_SECRET`

---

## Step 7: Test Deployment

### Health Checks

1. **Authentication**: Visit `https://jgdev.org/auth/signin` → sign up
2. **Dashboard**: After signup, verify redirect to `/dashboard`
3. **Subscription**: Click "Settings" → "Upgrade to Pro" → Stripe checkout
4. **Reports**: Owner user creates technician, check `/reports` page
5. **Technician**: Technician login, add entry on `/technician` page
6. **Offline**: Enable offline mode (DevTools → Network → Offline) → offline page displays

### Lighthouse PWA Audit

```bash
# Local PWA testing
npm run build
npm start
# Open DevTools → Lighthouse → Run PWA audit
# Target score: >= 90
```

---

## Step 8: Configure Production Secrets

### Store in Vercel

1. Go to **Project Settings → Environment Variables**
2. For each sensitive variable (marked with 🔒):
   - Add variable name and value
   - Select "Production" environment
   - Click "Save"

### Redeploy if variables changed

```bash
vercel --prod
```

---

## Monitoring & Maintenance

### Web Analytics

1. Enable in Vercel: **Settings → Web Analytics**
2. View dashboard at **Analytics tab**

### Logs

```bash
# View real-time logs
vercel logs --prod

# View error details
vercel logs --prod --level error
```

### Status Page

- Vercel Status: [status.vercel.com](https://status.vercel.com)
- Supabase Status: [status.supabase.com](https://status.supabase.com)
- Stripe Status: [status.stripe.com](https://status.stripe.com)

---

## Rollback & Troubleshooting

### Rollback to Previous Deployment

```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]
```

### Common Issues

| Issue | Solution |
|-------|----------|
| **Database connection error** | Verify `DATABASE_URL` is correct and includes production IP whitelist |
| **Stripe webhook failing** | Check `STRIPE_WEBHOOK_SECRET` and webhook endpoint URL in Stripe Dashboard |
| **Auth not working** | Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set |
| **PWA not installing** | Run Lighthouse audit; check manifest.json is accessible at `/manifest.json` |
| **Build fails** | Check build logs: `vercel logs --prod --level error` |

---

## Post-Deployment Checklist

- [ ] Environment variables set in Vercel dashboard
- [ ] Database migrations applied (`npx prisma migrate deploy`)
- [ ] Stripe webhook endpoint configured
- [ ] Custom domain (jgdev.org) DNS records updated
- [ ] Authentication tested (sign up/sign in works)
- [ ] Stripe checkout tested with test card
- [ ] Technician logbook tested (photo upload works)
- [ ] Reports download tested
- [ ] PWA install tested on mobile
- [ ] Offline page accessible
- [ ] Web analytics enabled
- [ ] Error logs monitored
- [ ] SSL certificate active (auto-generated by Vercel)
- [ ] Rate limiting configured (if needed)

---

## Quick Deploy Commands

```bash
# Final deployment
npm run build
vercel --prod

# Or with migrations
DATABASE_URL="..." npx prisma migrate deploy
vercel --prod

# Check status
vercel ls
vercel logs --prod
```

---

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **Stripe Docs**: https://stripe.com/docs
- **Prisma Docs**: https://www.prisma.io/docs

---

**Deployment Date**: _______________  
**Deployed By**: _______________  
**Environment**: Production (jgdev.org)
