## Supabase schema (migrations)

Run these statements in the **Supabase SQL editor** (Dashboard → SQL). Order matters: create `profiles` and the signup trigger before policies that reference `profiles`.

### `profiles` table and signup alignment

The app reads `profiles.role` and `profiles.plan` from the browser ([`hooks/usePermissions.ts`](../hooks/usePermissions.ts)). Each `auth.users` row should have a matching `public.profiles` row (same `id` as `auth.users.id`).

If you use the Supabase starter template, you may already have `public.profiles`. Otherwise create it and backfill:

```sql
-- Table (skip if you already have public.profiles from Supabase templates)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'technician',
  plan TEXT NOT NULL DEFAULT 'starter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Keep in sync with app defaults in lib/rbac/roles.ts
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'technician';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'starter';

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read/update their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- New auth users get a profile row (required for usePermissions / health checks)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, plan)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'fullName', ''),
    'technician',
    'starter'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

**Note:** If `profiles` already exists with different columns, adjust the `INSERT` to match your table. The trigger must run **after** sign-up so [`usePermissions`](../hooks/usePermissions.ts) and [`/api/health`](../pages/api/health.ts) can query `profiles`.

For **existing users** with no profile row:

```sql
INSERT INTO public.profiles (id, email, role, plan)
SELECT u.id, u.email, 'technician', 'starter'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
```

### `audit_logs`

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit_logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### `offline_queue` (optional server-side mirror)

```sql
CREATE TABLE IF NOT EXISTS offline_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  operation TEXT NOT NULL,
  table_name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  synced_at TIMESTAMPTZ,
  retry_count INT DEFAULT 0 NOT NULL
);

ALTER TABLE offline_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own queue" ON offline_queue USING (user_id = auth.uid());
```

### Plan / role source of truth

- **Prisma `Company.plan`** is used for dashboard gating ([`pages/api/dashboard-insights.ts`](../pages/api/dashboard-insights.ts)).
- **`profiles.plan`** is used for client RBAC ([`hooks/usePermissions.ts`](../hooks/usePermissions.ts)).

After onboarding creates a `Company` via the API, consider updating `profiles.plan` to match your billing tier, or align both in application code later.
