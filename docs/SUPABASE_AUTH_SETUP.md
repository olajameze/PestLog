# Supabase Auth redirects and email templates

Email confirmation and magic links only redirect to URLs that are allowlisted in the Supabase project.

## Redirect URLs (Dashboard → Authentication → URL configuration)

Add at least:

| Environment | Examples |
|-------------|----------|
| Local | `http://localhost:3000/auth/callback`, `http://localhost:3000/dashboard` |
| Production | `https://your-domain/auth/callback`, `https://your-domain/dashboard` |

The app sends users to [`/auth/callback`](../pages/auth/callback.tsx) after they click the confirmation link so the client can read the session from the URL (hash/query) and then send them to `/dashboard` (or the `next` query param if safe).

**Important:** `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_APP_URL` in [.env.local](../.env.example) must match the origin you use in the browser. If they point at production while you test on `localhost`, generated links in [`send-verification`](../pages/api/auth/send-verification.ts) will open the wrong site.

## One-time code in emails

Default Supabase templates often emphasise “click to log in” and omit the numeric code. For business registration step 2 (enter code on [sign up](../pages/auth/signup.tsx)), edit the relevant template under **Authentication → Email** and include the token, for example:

```text
Your verification code: {{ .Token }}
```

See the [Supabase email templates guide](https://supabase.com/docs/guides/auth/auth-email-templates).

## Slow local `next dev`

First compile after a cold start, TypeScript, Turbopack, Windows + OneDrive on the project folder, and antivirus scanning can make the dev server feel slow. Keeping the dev process running and excluding `node_modules` / `.next` from sync-heavy tools helps.
