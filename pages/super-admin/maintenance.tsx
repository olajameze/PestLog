import { useCallback, useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import { useToast } from '../../components/ui/ToastProvider';
import {
  buildMaintenanceSnapshot,
  type MaintenanceSnapshot,
} from '../../lib/maintenance/buildMaintenanceSnapshot';
import { getSuperAdminCookieName, verifySuperAdminToken } from '../../lib/superAdminAuth';

function originFromReq(hostProto: { proto?: string; host?: string }): string {
  const proto = hostProto.proto?.split(',')[0]?.trim() || 'http';
  const host =
    hostProto.host?.split(',')[0]?.trim() || `127.0.0.1:${process.env.PORT || '3000'}`;
  return `${proto}://${host}`;
}

function TrafficDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-3 w-3 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`}
      title={ok ? 'OK' : 'Issue'}
      aria-hidden
    />
  );
}

export default function SuperAdminMaintenancePage({ initialSnapshot }: { initialSnapshot: MaintenanceSnapshot }) {
  const { showToast } = useToast();
  const [snapshot, setSnapshot] = useState<MaintenanceSnapshot>(initialSnapshot);
  const [loading, setLoading] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/maintenance/snapshot', { credentials: 'same-origin' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(
          'Failed to load maintenance snapshot – please try again',
          typeof body.error === 'string' ? body.error : 'Request failed',
          'error',
        );
        return;
      }
      setSnapshot(body as MaintenanceSnapshot);
    } catch {
      showToast('Failed to load maintenance snapshot – please try again', 'Network error', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const runAction = useCallback(
    async (body: Record<string, unknown>, successVerb: string) => {
      setActing(successVerb);
      try {
        const res = await fetch('/api/super-admin/maintenance/action', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          showToast(
            'Maintenance action failed',
            typeof data.error === 'string' ? data.error : 'Request failed — check error logs.',
            'error',
          );
          return;
        }
        showToast('Done', typeof data.message === 'string' ? data.message : successVerb, 'success');
        await refresh();
      } catch {
        showToast('Maintenance action failed', 'Network error — please try again.', 'error');
      } finally {
        setActing(null);
      }
    },
    [refresh, showToast],
  );

  const health = snapshot.sections.systemHealth;
  const db = snapshot.sections.database;
  const webhooks = snapshot.sections.webhooks;
  const errs = snapshot.sections.errorLogs;

  const missingBanner = useMemo(
    () =>
      db.missingTables.length > 0 ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Some tables could not be queried.</p>
          <p className="mt-1">Missing or inaccessible: {db.missingTables.join(', ') || 'unknown'}</p>
          <Button
            type="button"
            className="mt-3"
            data-testid="maintenance-bootstrap-schema"
            disabled={Boolean(acting)}
            onClick={() => {
              void runAction({ action: 'bootstrap_schema' }, 'bootstrap_schema');
            }}
          >
            Create missing tables
          </Button>
        </div>
      ) : null,
    [acting, db.missingTables, runAction],
  );

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900">
      <Head>
        <title>Super Admin · Maintenance</title>
      </Head>
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Super Admin</p>
            <h1 className="mt-1 text-3xl font-bold text-zinc-950">Maintenance</h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-600">
              Monitor connectivity, database metrics, failed webhooks, and run guarded recovery actions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/super-admin"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50"
            >
              Back to directory
            </Link>
            <Button type="button" data-testid="maintenance-button-refresh" disabled={loading} onClick={() => void refresh()}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
        </div>

        {missingBanner}

        <section data-testid="maintenance-section-health" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">System health check</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <TrafficDot ok={health.supabaseConnected} />
              <span>
                Supabase (profiles probe){' '}
                {health.supabaseDetail ? (
                  <span className="text-zinc-500">— {health.supabaseDetail}</span>
                ) : null}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrafficDot ok={health.apiHealthOk} />
              <span>
                /api/health latency{' '}
                {health.apiHealthMs != null ? <strong>{health.apiHealthMs} ms</strong> : <span className="text-zinc-500">n/a</span>}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrafficDot ok={health.storageBucketOk} />
              <span>
                Storage bucket <code className="rounded bg-zinc-100 px-1">logbook-photos</code>{' '}
                {health.storageDetail ? <span className="text-zinc-500">— {health.storageDetail}</span> : null}
              </span>
            </div>
            <div className="text-sm text-zinc-700">
              Last background job:{' '}
              <strong>{health.lastBackgroundJob.jobName ?? 'None recorded'}</strong>
              {health.lastBackgroundJob.finishedAt ? (
                <>
                  {' '}
                  · {new Date(health.lastBackgroundJob.finishedAt).toLocaleString()}
                  {health.lastBackgroundJob.status ? ` (${health.lastBackgroundJob.status})` : ''}
                </>
              ) : null}
            </div>
          </div>
        </section>

        <section data-testid="maintenance-section-database" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900">Database management</h2>
            {!db.ok ? (
              <span className="text-xs font-semibold uppercase tracking-wide text-red-600">
                Failed to load database section – please try again
              </span>
            ) : null}
          </div>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
              <tr>
                <th className="py-2">Table</th>
                <th className="py-2">Rows</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(db.tableCounts).map(([name, count]) => (
                <tr key={name} className="border-b border-zinc-100">
                  <td className="py-2 font-mono text-xs">{name}</td>
                  <td className="py-2">{count === null ? <span className="text-amber-700">unavailable</span> : count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              type="button"
              data-testid="maintenance-button-vacuum"
              disabled={Boolean(acting)}
              onClick={() => void runAction({ action: 'vacuum' }, 'vacuum')}
            >
              Manual vacuum (analyze)
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={Boolean(acting)}
              onClick={() => {
                if (!window.confirm('Clear every row in offline_queue?')) return;
                void runAction({ action: 'clear_offline_queue' }, 'clear_offline_queue');
              }}
            >
              Clear offline_queue
            </Button>
          </div>
        </section>

        <section data-testid="maintenance-section-webhooks" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900">Webhook monitoring</h2>
            {!webhooks.ok ? (
              <span className="text-xs font-semibold uppercase tracking-wide text-red-600">
                Failed to load webhooks – please try again
              </span>
            ) : null}
          </div>
          {webhooks.failed.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-600">No unresolved webhook_errors rows.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {webhooks.failed.map((w) => (
                <li key={w.id} className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-sm">
                  <p className="font-semibold">{w.eventType ?? 'unknown event'}</p>
                  <p className="text-zinc-600">{w.errorMessage}</p>
                  <p className="mt-1 text-xs text-zinc-500">{new Date(w.createdAt).toLocaleString()}</p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-2"
                    disabled={Boolean(acting)}
                    data-testid={`maintenance-retry-webhook-${w.id}`}
                    onClick={() => void runAction({ action: 'retry_webhook', id: w.id }, 'retry_webhook')}
                  >
                    Retry reconcile
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section data-testid="maintenance-section-error-logs" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900">Error logs</h2>
            {!errs.ok ? (
              <span className="text-xs font-semibold uppercase tracking-wide text-red-600">
                Failed to load error logs – please try again
              </span>
            ) : null}
            <Link
              className="text-sm font-semibold text-blue-600 underline"
              href="/api/super-admin/maintenance/error-log-export"
              data-testid="maintenance-download-errors"
              prefetch={false}
            >
              Download JSON
            </Link>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {errs.items.length === 0 ? (
              <li className="text-zinc-500">No captured errors yet.</li>
            ) : (
              errs.items.map((row) => (
                <li key={row.id} className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                  <p className="font-semibold text-zinc-900">{row.message}</p>
                  <p className="text-xs text-zinc-500">{new Date(row.createdAt).toLocaleString()}</p>
                  {row.stackPreview ? <pre className="mt-2 max-h-24 overflow-auto text-xs text-zinc-700">{row.stackPreview}</pre> : null}
                </li>
              ))
            )}
          </ul>
        </section>

        <section data-testid="maintenance-section-actions" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-zinc-900">Manual fix actions</h2>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={Boolean(acting)}
                data-testid="maintenance-refresh-plans"
                onClick={() => void runAction({ action: 'refresh_plans' }, 'refresh_plans')}
              >
                Refresh all user plans (Stripe)
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={Boolean(acting)}
                data-testid="maintenance-purge-sessions"
                onClick={() => void runAction({ action: 'purge_sessions' }, 'purge_sessions')}
              >
                Purge stale auth sessions
              </Button>
            </div>
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-sm font-semibold text-zinc-900">Delete Supabase auth user by email</p>
              <p className="mt-1 text-xs text-zinc-600">
                Removes the auth account only (does not run full company teardown). Protected super-admin email is blocked.
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div data-testid="maintenance-delete-email-input">
                <FormInput
                  label="Email"
                  id="maintenance-delete-email"
                  type="email"
                  value={deleteEmail}
                  onChange={(e) => setDeleteEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
                <Button
                  type="button"
                  variant="danger"
                  disabled={Boolean(acting) || !deleteEmail.includes('@')}
                  data-testid="maintenance-delete-user"
                  onClick={() => {
                    if (
                      !window.confirm(
                        `Permanently delete auth user ${deleteEmail.trim()}? This cannot be undone.`,
                      )
                    ) {
                      return;
                    }
                    void runAction({ action: 'delete_user_by_email', email: deleteEmail.trim() }, 'delete_user');
                  }}
                >
                  Delete user
                </Button>
              </div>
            </div>
          </div>
        </section>

        <p className="text-center text-xs text-zinc-400">
          Generated {new Date(snapshot.generatedAt).toLocaleString()} · pesttrace maintenance tools
        </p>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<{ initialSnapshot: MaintenanceSnapshot }> = async (ctx) => {
  const token = ctx.req.cookies[getSuperAdminCookieName()];
  if (!verifySuperAdminToken(token)) {
    return {
      redirect: {
        destination: '/auth/super-admin',
        permanent: false,
      },
    };
  }

  const xfProto = ctx.req.headers['x-forwarded-proto'];
  const proto = Array.isArray(xfProto) ? xfProto[0] : xfProto;
  const host = ctx.req.headers.host;
  const snapshot = await buildMaintenanceSnapshot(originFromReq({ proto, host }));

  return {
    props: {
      initialSnapshot: snapshot,
    },
  };
};
