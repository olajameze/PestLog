import { useState } from 'react';
import { useRouter } from 'next/router';
import AuthLayout from '../../components/layouts/AuthLayout';
import FormInput from '../../components/ui/FormInput';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';

export default function SuperAdminSignInPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  return (
    <AuthLayout
      title="Super admin sign in"
      subtitle="Restricted access for platform management only."
    >
      <form onSubmit={handleSubmit} className={`space-y-5 ${error ? 'field-shake' : ''}`}>
        <FormInput
          label="Super Admin Email"
          id="super-admin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="super-admin@yourdomain.com"
        />
        <FormInput
          label="Password"
          id="super-admin-password"
          type="password"
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

