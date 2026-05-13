# Signup / welcome email (Resend)

## Current behaviour

After **business** signup, the client calls `POST /api/auth/welcome` (`pages/api/auth/welcome.ts`), which sends `sendWelcomeEmail` from `lib/email.ts` via **Resend** (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`).

That email goes to the **new user** (welcome + verify guidance), not to operators by default.

## Optional developer alert

To notify yourself on every signup, extend `sendWelcomeEmail` or `pages/api/auth/welcome.ts` with an additional `sendMail` call (e.g. BCC to `SUPPORT_EMAIL` or a dedicated `NEW_SIGNUP_NOTIFY_EMAIL`). Keep templates short and avoid leaking secrets.

## Environment variables

| Variable | Role |
|----------|------|
| `RESEND_API_KEY` | Server-side Resend API key |
| `RESEND_FROM_EMAIL` | Verified sender domain |
| `SUPPORT_EMAIL` | Used in templates / reply hints |

Remember: Supabase **OTP / magic link** delivery uses **Supabase SMTP**, not this route — configure Supabase to use Resend SMTP if you want unified delivery (see `.env.example` comments).
