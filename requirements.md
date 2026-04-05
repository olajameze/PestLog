# PestLog – Requirements Document

## Project Overview
A compliance logbook SaaS for pest control businesses. Helps prove technician certification and log jobs digitally to comply with UK regulations (Rodenticide Stewardship Regime, effective June 2025).

## Tech Stack
- Next.js 14 (Pages Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, PostgreSQL, Storage)
- Prisma ORM
- Stripe (subscriptions)
- Resend (emails)
- next-pwa (PWA)
- jsPDF (reports)

## Core Features
1. Company signup/login
2. Owner dashboard – manage technicians, upload certifications
3. Technician logbook – log jobs with e‑signature
4. Compliance report – PDF generation
5. Subscription – Stripe Checkout with 14‑day free trial
6. PWA – installable, offline fallback

## Design System
- Colours: #2563EB (primary), #1E293B (navy), #F8F9FA (off-white)
- Font: Inter
- Spacing: 8px grid
- Mobile‑first responsive

## Deployment
- Domain: jgdev.org
- Hosting: Vercel
- Environment variables: see `.env.example`

## Setup Commands
```bash
npm install
npx prisma migrate dev --name init
npm run dev
