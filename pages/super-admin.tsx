import { useMemo, useState } from 'react';
import type { GetServerSideProps } from 'next';
import { useRouter } from 'next/router';
import Button from '../components/ui/Button';
import { getSupabaseAdmin } from '../lib/supabase-admin';
import { getSuperAdminCookieName, verifySuperAdminToken } from '../lib/superAdminAuth';

type SuperAdminUser = {
  id: string;
  email: string;
  createdAt: string | null;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  role: string;
  bannedUntil: string | null;
};

export default function SuperAdminPage({ initialUsers, initialError }: SuperAdminPageProps) {
  const router = useRouter();
  const [users, setUsers] = useState<SuperAdminUser[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'technician' | 'unknown'>('all');
  const [actionTargetId, setActionTargetId] = useState<string | null>(null);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, 'admin' | 'technician'>>({});

  const totals = useMemo(() => {
    const admins = users.filter((u) => u.role === 'admin').length;
    const technicians = users.filter((u) => u.role === 'technician').length;
    return { all: users.length, admins, technicians };
  }, [users]);

  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const roleMatches = roleFilter === 'all' ? true : u.role === roleFilter;
      const searchMatches = q.length === 0 ? true : u.email.toLowerCase().includes(q);
      return roleMatches && searchMatches;
    });
  }, [users, search, roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    const response = await fetch('/api/super-admin/users');
    if (!response.ok) {
      if (response.status === 401) {
        router.replace('/auth/super-admin');
        return;
      }
      const body = await response.json().catch(() => ({ error: 'Failed to load users' }));
      setError(body.error || 'Failed to load users');
      setLoading(false);
      return;
    }
    const body = await response.json();
    setUsers(Array.isArray(body.users) ? body.users : []);
    setLoading(false);
  };

  const handleLogout = async () => {
    await fetch('/api/super-admin/logout', { method: 'POST' });
    router.replace('/auth/super-admin');
  };

  const runUserAction = async (
    userId: string,
    action: 'disable' | 'enable' | 'force_signout' | 'set_role' | 'delete',
    role?: 'admin' | 'technician',
  ) => {
    setActionTargetId(userId);
    setError('');
    try {
      const response =
        action === 'delete'
          ? await fetch(`/api/super-admin/users/${userId}`, { method: 'DELETE' })
          : await fetch(`/api/super-admin/users/${userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action === 'set_role' ? { action, role } : { action }),
            });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: 'Action failed' }));
        setError(body.error || 'Action failed');
      } else {
        await loadUsers();
      }
    } finally {
      setActionTargetId(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-offwhite flex items-center justify-center">Loading super admin panel...</div>;
  }

  return (
    <div className="min-h-screen bg-offwhite px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl min-w-0 space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-navy">Super Admin</h1>
              <p className="mt-1 text-sm text-zinc-600">Manage signed-up users across the application.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" onClick={loadUsers}>Refresh users</Button>
              <Button variant="danger" size="sm" onClick={handleLogout}>Sign out</Button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by email..."
              className="form-input"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'technician' | 'unknown')}
              className="form-select"
            >
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="technician">Technician</option>
              <option value="unknown">Unknown</option>
            </select>
            <div className="text-sm text-zinc-600 flex items-center">
              Showing {visibleUsers.length} of {users.length} users
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Total users</p>
            <p className="mt-2 text-2xl font-bold text-navy">{totals.all}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Admins</p>
            <p className="mt-2 text-2xl font-bold text-navy">{totals.admins}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Technicians</p>
            <p className="mt-2 text-2xl font-bold text-navy">{totals.technicians}</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Email Verified</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Last sign in</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => {
                  const isDisabled =
                    Boolean(user.bannedUntil) && new Date(user.bannedUntil as string).getTime() > Date.now();
                  const roleDraft = roleDrafts[user.id] ?? (user.role === 'admin' ? 'admin' : 'technician');
                  return (
                  <tr key={user.id} className="border-t border-zinc-100">
                    <td className="px-4 py-3 text-zinc-800">{user.email || '—'}</td>
                    <td className="px-4 py-3 text-zinc-700">{user.role}</td>
                    <td className="px-4 py-3 text-zinc-700">{isDisabled ? 'Disabled' : 'Active'}</td>
                    <td className="px-4 py-3 text-zinc-700">{user.emailConfirmedAt ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      {user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[340px] flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={isDisabled ? 'success' : 'secondary'}
                          disabled={actionTargetId === user.id}
                          onClick={() => runUserAction(user.id, isDisabled ? 'enable' : 'disable')}
                        >
                          {isDisabled ? 'Enable' : 'Disable'}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actionTargetId === user.id}
                          onClick={() => runUserAction(user.id, 'force_signout')}
                        >
                          Force sign-out
                        </Button>
                        <select
                          value={roleDraft}
                          onChange={(e) =>
                            setRoleDrafts((prev) => ({
                              ...prev,
                              [user.id]: e.target.value as 'admin' | 'technician',
                            }))
                          }
                          className="form-select !h-9 !min-h-[2.25rem] !py-1 !px-2 text-sm"
                        >
                          <option value="admin">Admin</option>
                          <option value="technician">Technician</option>
                        </select>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actionTargetId === user.id || roleDraft === user.role}
                          onClick={() => runUserAction(user.id, 'set_role', roleDraft)}
                        >
                          Apply role
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={actionTargetId === user.id}
                          onClick={() => {
                            if (window.confirm(`Delete ${user.email}? This cannot be undone.`)) {
                              runUserAction(user.id, 'delete');
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

type SuperAdminPageProps = {
  initialUsers: SuperAdminUser[];
  initialError: string;
};

export const getServerSideProps: GetServerSideProps<SuperAdminPageProps> = async (ctx) => {
  const token = ctx.req.cookies[getSuperAdminCookieName()];
  if (!verifySuperAdminToken(token)) {
    return {
      redirect: {
        destination: '/auth/super-admin',
        permanent: false,
      },
    };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      props: {
        initialUsers: [],
        initialError: 'Supabase admin client not configured',
      },
    };
  }

  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });

  const users: SuperAdminUser[] = (data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? '',
    createdAt: u.created_at ?? null,
    lastSignInAt: u.last_sign_in_at ?? null,
    emailConfirmedAt: u.email_confirmed_at ?? null,
    role: typeof u.user_metadata?.role === 'string' ? u.user_metadata.role : 'unknown',
    bannedUntil: u.banned_until ?? null,
  }));

  return {
    props: {
      initialUsers: users,
      initialError: error?.message ?? '',
    },
  };
};

