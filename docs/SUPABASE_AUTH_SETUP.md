# Supabase Auth redirects and email templates

Email confirmation and magic links only redirect to URLs that are allowlisted in the Supabase project.

## Redirect URLs (Dashboard → Authentication → URL configuration → Redirect URLs)

Add at least:

| Environment | Examples |
|-------------|----------|
| Local | `http://localhost:3000/auth/callback`, `http://localhost:3000/dashboard` |
| Production | `https://your-domain/auth/callback`, `https://your-domain/dashboard` |

No matter which email template you edit, links in those emails only work if their **`redirect_to` / post-click URL** matches an entry in **Redirect URLs**.

The app sends users to [`/auth/callback`](../pages/auth/callback.tsx) after they click the confirmation link from **`signUp`** (see [`authCallbackUrl`](../lib/authRedirect.ts) for `emailRedirectTo`). The callback reads the session from the URL, then redirects to `/dashboard` (or a safe `next` query param).

**Important:** `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` in [.env.local](../.env.example) must match the origin you use in the browser. If they point at production while you test on `localhost`, generated links in [`send-verification`](../pages/api/auth/send-verification.ts) will open the wrong site.

## Email templates by flow (Dashboard → Authentication → Email)

These map to the code in [`signin`](../pages/auth/signin.tsx), [`signup`](../pages/auth/signup.tsx), and [`forgot-password`](../pages/auth/forgot-password.tsx).

| Flow | App usage | Template to edit | Guidance |
|------|-----------|------------------|----------|
| Technician sign-in | `signInWithOtp` → typed `verifyOtp({ type: 'email' })` | **Magic link** (the template Supabase uses for OTP / magic-link sends) | Add the OTP in the body. Example: `<p>Please enter this code: {{ .Token }}</p>`. Required because the UI only accepts a typed code. |
| Business registration step 1 | `signUp` (confirmation email) | **Confirm signup** | Keep **link-based**; no `{{ .Token }}` needed for the initial confirm step. |
| Business registration step 2 | `signInWithOtp` after the user exists | **Magic link** (same template as technicians) | Add `{{ .Token }}` so users can finish registration on the [signup](../pages/auth/signup.tsx) screen. |
| Password reset | `resetPasswordForEmail` | **Reset password** | Keep **link-based**; typically **no** `{{ .Token }}` in that template. |

Template **labels in the Supabase UI** can differ by project version (for example **Email OTP** vs **Magic link**). What matters is: any template that backs **`signInWithOtp`** must expose **`{{ .Token }}`** if users type the code in the app.

See the [Supabase email templates guide](https://supabase.com/docs/guides/auth/auth-email-templates).

## Slow local `next dev`

First compile after a cold start, TypeScript, Turbopack, Windows + OneDrive on the project folder, and antivirus scanning can make the dev server feel slow. Keeping the dev process running and excluding `node_modules` / `.next` from sync-heavy tools helps.
