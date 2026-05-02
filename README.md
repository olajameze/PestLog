# Pest Trace

A compliance logbook SaaS for pest control businesses.

## Features

- User authentication with Supabase
- Business management
- Pest control log entries
- PDF export for compliance
- Subscription payments with Stripe
- PWA support
- Deployed on Vercel at pesttrace.com

## Tech Stack

- Next.js 14 (Pages Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, Database)
- Prisma ORM
- Stripe (Payments)
- Resend (Emails)
- jsPDF (PDF generation)
- next-pwa (PWA)

## Getting Started

1. Clone the repo
2. Install dependencies: `npm install`
3. Copy [`.env.example`](.env.example) to `.env.local` and set variables (`DATABASE_URL`, `DIRECT_URL`, Supabase keys — see file comments)
4. Apply the schema: `npx prisma db push` (or `npx prisma migrate dev` once you have migrations)
5. Run the development server: `npm run dev`

## Plans and billing QA

- **[docs/TIER_MATRIX.md](docs/TIER_MATRIX.md)** — which features belong to Trial / Pro / Business / Enterprise (aligned with code).
- **[docs/STRIPE_WEBHOOK_QA.md](docs/STRIPE_WEBHOOK_QA.md)** — Stripe test-mode checkout + webhook checklist.
- Webhook smoke (no real Stripe call): `npm run e2e:webhook`

## Deployment

Deployed on Vercel with custom domain pesttrace.com.

## Environment Variables

Set the following in `.env.local` or Vercel (see [`.env.example`](.env.example) for the full list):

- `DATABASE_URL` — pooled Supabase Postgres URL for the app (port 6543, `pgbouncer=true`)
- `DIRECT_URL` — direct Postgres URL for Prisma CLI / migrations (port 5432)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (and optional price IDs for checkout)
- `RESEND_API_KEY`, `NEXTAUTH_URL` (and other email/auth vars as needed)

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
