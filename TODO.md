# Dashboard Enhancements & Email Implementation TODO

## ✅ Completed
- [x] Create .env.local with RESEND_API_KEY and SUPPORT_EMAIL
- [x] Enhance lib/email.ts with templates
- [x] Create api/auth/welcome.ts endpoint


- [ ] Enhance lib/email.ts with templates
- [x] Update auth/signup.tsx with welcome + verification emails

- [ ] Update auth/signin.tsx with verification check
- [ ] Enhance auth/verify.tsx with resend button
- [x] Create api/auth/welcome.ts endpoint

- [ ] Enhance api/auth/send-verification.ts
- [ ] Update api/account/delete.ts with email
- [ ] Update api/subscription.ts with upgrade email
- [ ] Update hooks/useRequireSession.ts with email_verified check
- [ ] Enhance components/PWAInstallPrompt.tsx with update detection
- [ ] Update public/sw.js for update notification
- [ ] Update remaining email references (SettingsTab, upgrade, footer)
- [x] Install resend package if missing

- [ ] Full test: signup → verify → login → contact → PWA update
- [ ] npm run build && npm run lint

