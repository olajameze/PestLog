import { supabaseAdmin } from '../supabase-admin';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export type AuditLogInsert = {
  userId: string;
  action: AuditAction;
  tableName: string;
  recordId: string;
  oldValues?: unknown;
  newValues?: unknown;
  ipAddress?: string | null;
};

export async function writeAuditLog(entry: AuditLogInsert): Promise<void> {
  // Best-effort: if the table doesn't exist yet (migration not applied),
  // we silently no-op to avoid breaking core flows.
  const { error } = await supabaseAdmin.from('audit_logs').insert({
    user_id: entry.userId,
    action: entry.action,
    table_name: entry.tableName,
    record_id: entry.recordId,
    old_values: entry.oldValues ?? null,
    new_values: entry.newValues ?? null,
    ip_address: entry.ipAddress ?? null,
  });

  if (error) {
    // Do not throw; audit logging must not break primary operations.
    return;
  }
}

