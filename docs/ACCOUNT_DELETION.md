# Account deletion with feedback

## User flow (`/dashboard` → Settings)

1. User chooses **Delete account** → modal opens (`data-testid="delete-account-modal"`).
2. Question **Why are you leaving?** — single-choice reasons (see `lib/accountDeletionReasons.ts`).
3. Optional comment; **Other (please specify)** requires at least **3** characters in the comment box.
4. On confirm, the client calls `POST /api/account/delete` with JSON `{ reason, comment? }` and `Authorization: Bearer <access_token>`.

## API (`pages/api/account/delete.ts`)

1. Validates session and company owner (technicians cannot delete the tenant).
2. **Writes `public.deletion_feedback`** (`user_id`, `user_email`, `reason`, `comment`, `deleted_at`).  
   - If this insert fails, deletion **aborts** with a friendly error.
3. Cancels Stripe subscriptions, deletes Prisma company cascade, sends deletion email, deletes Supabase auth user via **service role**.
4. Legacy **`DELETE`** requests without a body remain supported for older clients and record reason `Not specified (legacy client)`.

## GDPR / retention notes

- Feedback is stored as a **legitimate interest / product improvement** artefact; align retention with your privacy policy.
- Auth deletion removes login access; ensure backups and third-party processors (Stripe, Supabase) match your DPA.
- Technicians cannot trigger full tenant deletion from this endpoint.

## Preview mode

When `preview=1` on the dashboard in development, deletion is blocked in UI (`previewMode` prop on `SettingsTab`).
