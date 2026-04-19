## Supabase schema (migrations)

Run these statements in the Supabase SQL editor.

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

### `profiles` additions

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'technician';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'starter';
```

