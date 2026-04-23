# Pest Trace Quick Reference Guide

**Status**: ✅ Production Ready  
**Environment**: Next.js 16 + TypeScript + Tailwind  
**Deployment Target**: pesttrace.com via Vercel

---

## 🚀 Get Started (5 Minutes)

### 1. Clone & Install

```bash
git clone <repository-url>
cd pesttrek
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=<from Supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from Supabase>
DATABASE_URL=<PostgreSQL connection string>
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
NEXTAUTH_URL=http://localhost:3000
```

### 3. Run Locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## 📋 Key Features at a Glance

| Feature | Owner | Technician | Link |
|---------|-------|-----------|------|
| **Sign Up / Sign In** | ✅ | ✅ | `/auth/signin`, `/auth/signup` |
| **Dashboard** | ✅ | - | `/dashboard` |
| **Manage Technicians** | ✅ | - | `/dashboard` → Technicians tab |
| **Logbook Entry** | - | ✅ | `/technician` |
| **Photo Upload** | - | ✅ | `/technician` (Supabase storage) |
| **Compliance Reports** | ✅ | - | `/reports` (PDF export) |
£35/mo, 7-day trial
| **Offline Access** | ✅ | ✅ | `_offline.tsx` (PWA fallback) |
| **Mobile Install** | ✅ | ✅ | PWA prompt on Chrome |

---

## 🛠 Common Tasks

### Add a New API Endpoint

```bash
# Create file: pages/api/my-endpoint.ts

import { getPrismaClient } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const prisma = getPrismaClient();
    const data = await prisma.model.findMany();
    return res.status(200).json(data);
  }

  res.status(405).json({ error: 'Method not allowed' });
}
```

### Update Database Schema

```bash
# Edit prisma/schema.prisma
# Add/modify model

# Create migration
npx prisma migrate dev --name "description"

# Apply to production
DATABASE_URL="[production-url]" npx prisma migrate deploy
```

### Add a New Page

```bash
# Create file: pages/my-page.tsx

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';

export default function MyPage() {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  return (
    <div className="p-4">
      <h1>My Page</h1>
    </div>
  );
}
```

### Style with Tailwind + Hover Effect

```tsx
// Use Tailwind classes + CSS hover-lift
<div className="bg-white rounded-lg shadow-lg p-6 hover-lift">
  <h2>Card Title</h2>
  <p>Content here</p>
</div>

// Or add hover-lift in CSS
<div className="border border-gray-200 rounded-lg p-4 hover-lift">
  Interactive element
</div>
```

### Add Loading Spinner Feedback

```tsx
<button
  disabled={loading}
  onClick={async () => {
    setLoading(true);
    try {
      await doSomething();
    } finally {
      setLoading(false);
    }
  }}
>
  {loading ? (
    <>
      <span className="spinner"></span> Processing...
    </>
  ) : (
    'Click Me'
  )}
</button>
```

### Fetch Subscription Status

```ts
// API endpoint: /api/subscription
const response = await fetch('/api/subscription');
const { trial_ends_at, status, account_type } = await response.json();

// Types:
// trial_ends_at: ISO date string or null
// status: 'active' | 'trial' | 'expired'
// account_type: 'owner' | 'technician'
```

### Process Stripe Payment

```ts
// 1. Frontend: Redirect to checkout
const response = await fetch('/api/create-checkout-session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ planId: 'monthly' })
});
const { url } = await response.json();
window.location.href = url; // Redirect to Stripe

// 2. Backend webhook: /api/webhooks/stripe receives update
// 3. Database: Subscription status updated via Prisma
```

---

## 🔐 Environment Variables Cheat Sheet

### Development

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyxxxx...
DATABASE_URL=postgresql://localhost/pesttrace
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

### Production (Vercel)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyxxxx...
DATABASE_URL=postgresql://prod-server/pesttrace-prod
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_...
NEXTAUTH_URL=https://pesttrace.com
NODE_ENV=production
```

---

## 📊 API Reference

### GET /api/subscription

Returns subscription status for current user (owner or technician).

**Response:**
```json
{
  "trial_ends_at": "2025-02-15T00:00:00Z",
  "status": "trial",
  "account_type": "owner"
}
```

### POST /api/create-checkout-session

Creates Stripe checkout session.

**Body:**
```json
{
  "planId": "monthly"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

### POST /api/create-portal-session

Creates Stripe billing portal session.

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

### GET /api/technician-logbook

Fetches logbook entries for technician.

**Query:**
```
?startDate=2025-01-01&endDate=2025-01-31&limit=50
```

**Response:**
```json
{
  "entries": [
    {
      "id": "uuid",
      "job_type": "pest_inspection",
      "notes": "Found droppings",
      "photo_url": "https://storage.supabase.co/...",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### GET /api/reports

Fetches compliance reports.

**Query:**
```
?startDate=2025-01-01&endDate=2025-01-31&jobType=pest_inspection
```

**Response:**
```json
{
  "reports": [
    {
      "id": "uuid",
      "technician_name": "John Doe",
      "entries_count": 12,
      "certifications": ["test_cert_1"],
      "pdf_export_url": "..."
    }
  ]
}
```

---

## 🧪 Testing Checklist

### Local Testing

- [ ] `npm run dev` starts without errors
- [ ] Sign up with test email works
- [ ] Magic link email received
- [ ] Sign in successful, redirects to dashboard
- [ ] Add technician works
- [ ] Technician logbook entry created with photo
- [ ] PDF report exports without errors
- [ ] Stripe test payment succeeds
- [ ] Offline page loads when network disabled

### Production Testing

- [ ] Site loads at https://pesttrace.com
- [ ] SSL certificate active (green lock)
- [ ] All features from "Local Testing" work on live
- [ ] Errors logged to console (check Vercel logs)
- [ ] Lighthouse PWA score ≥ 90

---

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Build fails with TypeScript error" | Run `npx prisma generate` then rebuild |
| "Database connection error" | Verify `DATABASE_URL` and IP whitelist in database settings |
| "Stripe webhook not receiving" | Confirm webhook endpoint in Stripe Dashboard vs. deployed URL |
| "Auth not working" | Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| "Photo upload fails" | Verify Supabase storage bucket `logbook-photos` exists and is public |
| "Still on Trial after Upgrade" | 1. Run Stripe CLI listener locally. 2. Verify `STRIPE_WEBHOOK_SECRET`. 3. Check `client_reference_id` in Stripe logs. |
| "PWA not installing on mobile" | Check manifest.json is accessible at `/manifest.json` |

---

## 📚 Documentation Files

- [DEPLOYMENT.md](DEPLOYMENT.md) - Full Vercel deployment guide
- [GO-LIVE-CHECKLIST.md](GO-LIVE-CHECKLIST.md) - Pre/post-launch checklist
- [CODEBASE.md](CODEBASE.md) - Complete file structure & technology stack
- [README.md](README.md) - Project overview

---

## 🎯 Next Steps

1. **Review** [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel setup
2. **Complete** [GO-LIVE-CHECKLIST.md](GO-LIVE-CHECKLIST.md) before launch
3. **Test** all features locally: `npm run dev`
4. **Deploy**: `vercel --prod` after env vars configured
5. **Monitor**: Check Vercel logs and uptime after deployment

---

## 💡 Pro Tips

- Use `vercel logs --prod` to view production errors in real-time
- Run `npx prisma studio` to inspect database visually
- Test Stripe webhooks locally with: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- PWA works offline: DevTools → Network → Offline → site still loads
- Hover effects only on desktop: CSS uses `@media (hover: hover) and (pointer: fine)`

---

## 📞 Support

- **Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **Stripe**: [stripe.com/docs](https://stripe.com/docs)
- **Supabase**: [supabase.com/docs](https://supabase.com/docs)
- **Vercel**: [vercel.com/docs](https://vercel.com/docs)

---

**Last Updated**: January 2025  
**Version**: 1.0 (MVP Complete)
