import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AuthLayout from '../../components/layouts/AuthLayout';
import FormInput from '../../components/ui/FormInput';
import PasswordField from '../../components/ui/PasswordField';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';

export default function SuperAdminSignInPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [configStatus, setConfigStatus] = useState<'loading' | 'configured' | 'missing'>('loading');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const response = await fetch('/api/super-admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: 'Sign in failed' }));
      setError(body.error || 'Sign in failed');
      showToast('Super admin sign in failed', body.error || 'Sign in failed', 'error');
      setLoading(false);
      return;
    }

    showToast('Signed in', 'Welcome to super admin control panel.', 'success');
    router.push('/super-admin');
  };

  useEffect(() => {
    const checkConfig = async () => {
      const response = await fetch('/api/super-admin/config');
      if (!response.ok) {
        setConfigStatus('missing');
        return;
      }
      const body = await response.json();
      setConfigStatus(body.configured ? 'configured' : 'missing');
    };
    checkConfig().catch(() => setConfigStatus('missing'));
  }, []);

  return (
    <AuthLayout
      title="Super admin sign in"
      subtitle="Restricted access for platform management only."
    >
      <form onSubmit={handleSubmit} className={`space-y-5 ${error ? 'field-shake' : ''}`}>
        <div
          className={`rounded-xl border px-3 py-2 text-xs ${
            configStatus === 'configured'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : configStatus === 'missing'
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-zinc-200 bg-zinc-50 text-zinc-600'
          }`}
        >
          {configStatus === 'loading'
            ? 'Checking super admin configuration...'
            : configStatus === 'configured'
              ? 'Super admin credentials are configured for this environment.'
              : 'Super admin is not configured. Add SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD, and SUPER_ADMIN_SESSION_SECRET.'}
        </div>
        <FormInput
          label="Super Admin Email"
          id="super-admin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="super-admin@yourdomain.com"
        />
        <PasswordField
          label="Password"
          id="super-admin-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
        />
        {error ? <div className="form-feedback form-feedback-error">{error}</div> : null}
        <div className="flex justify-center">
          <Button type="submit" disabled={loading} size="sm">
            {loading ? 'Signing in...' : 'Sign In as Super Admin'}
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}

