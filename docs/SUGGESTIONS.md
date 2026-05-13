# Landing suggestions (`/home`)

## Behaviour

- Section title: **Help us improve PestTrace – suggest a compliance feature** (`components/landing/SuggestionsSection.tsx`), appended **below** existing marketing sections on `pages/home.tsx`.
- Submissions go to `POST /api/suggestions` (no authentication). The handler uses the **Supabase service-role client** so rows can be inserted while Row Level Security remains enabled for anon/authenticated PostgREST access patterns.
- Fields: optional name/email, required suggestion text (**minimum 10 characters** validated server-side), category dropdown defaulting to **Other** when invalid.

## Database schema (`public.suggestions`)

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` | Primary key |
| `name` | `text` | Nullable |
| `email` | `text` | Nullable, basic format check |
| `suggestion` | `text` | Required |
| `category` | `text` | One of the allowed labels |
| `ip_hash` | `text` | SHA-256 of client IP (`x-forwarded-for` first hop or socket address) |
| `created_at` | `timestamptz` | Default now |

RLS: **anon** may **INSERT** only; **SELECT** denied for anon/authenticated via policies (direct Prisma/service inserts bypass PostgREST).

## Spam / abuse controls

- **Rate limit:** max **3** inserts per `ip_hash` per rolling hour (`429` + message “Too many requests, please wait an hour”).
- No public read API — reduces scraping/noise.
- Optional moderation: query `suggestions` from SQL editor or Prisma with service credentials.

## Errors (user-facing)

- Insert failure → “Please try again later”.
- Rate limit → “Too many requests, please wait an hour”.
- Invalid email → validation message from API.
