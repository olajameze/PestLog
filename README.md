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
3. Copy `.env.example` to `.env` and set variables (especially `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` for Supabase)
4. Apply the schema: `npx prisma db push` (or `npx prisma migrate dev` once you have migrations)
5. Run the development server: `npm run dev`

## Deployment

Deployed on Vercel with custom domain pesttrace.com.

## Environment Variables

Set the following in your `.env` or Vercel environment:

- `POSTGRES_PRISMA_URL` (pooled; used by the Next.js app)
- `POSTGRES_URL_NON_POOLING` (session/direct; used by Prisma CLI — avoids pooler prepared-statement errors)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_PUBLISHABLE_KEY
- STRIPE_WEBHOOK_SECRET
- RESEND_API_KEY
- NEXTAUTH_SECRET
- NEXTAUTH_URL

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
