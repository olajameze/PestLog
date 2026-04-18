# Dashboard Enhancements & Email Implementation TODO

## Completed
- [x] Create .env.local with RESEND_API_KEY and SUPPORT_EMAIL (local only; not committed)
- [x] Enhance lib/email.ts with templates
- [x] Create api/auth/welcome.ts endpoint
- [x] Update auth/signup.tsx with welcome + verification emails
- [x] Update auth/signin.tsx with verification check
- [x] Enhance auth/verify.tsx with resend button
- [x] Enhance api/auth/send-verification.ts
- [x] Update api/account/delete.ts with email
- [x] Update api/subscription.ts with upgrade email (helper + Stripe webhook)
- [x] Update hooks/useRequireSession.ts with email_verified check
- [x] Enhance components/PWAInstallPrompt.tsx with update detection
- [x] Update public/sw.js for update notification
- [x] Update remaining email references (SettingsTab, upgrade, footer)
- [x] Install resend package if missing
- [x] npm run build && npm run lint

## Manual QA (when credentials available)
- [ ] Full test: signup → verify → login → contact → PWA update
