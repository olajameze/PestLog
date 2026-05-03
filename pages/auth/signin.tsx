import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';
import AuthLayout from '../../components/layouts/AuthLayout';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import PasswordField from '../../components/ui/PasswordField';
import { useToast } from '../../components/ui/ToastProvider';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();
  const { showToast } = useToast();
  const role = typeof router.query.role === 'string' ? router.query.role : 'admin';
  const isTechnicianFlow = role === 'technician';

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      showToast('Sign in failed', error.message, 'error');
    } else if (!data.session) {
      setSuccessMessage('Please verify your email before accessing the dashboard.');
      showToast('Email verification required', 'Check your inbox or resend verification from the next screen.', 'info');
      router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
    } else {
      const u = data.session.user as {
        email_confirmed_at?: string | null;
        confirmed_at?: string | null;
        email_confirmed?: boolean;
      };
      const verified = Boolean(u.email_confirmed_at ?? u.confirmed_at ?? u.email_confirmed);
      if (!verified && !isTechnicianFlow) {
        setSuccessMessage('Please verify your email before accessing the dashboard.');
        showToast('Email verification required', 'Check your inbox for the verification email.', 'info');
        router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
        setLoading(false);
        return;
      }
      if (isTechnicianFlow) {
        setSuccessMessage('Signed in successfully. Redirecting to technician workspace...');
        showToast('Signed in', 'Redirecting to technician workspace', 'success');
        router.push('/technician');
      } else {
        setSuccessMessage('Signed in successfully. Redirecting to dashboard...');
        showToast('Signed in', 'Redirecting to dashboard', 'success');
        router.push('/dashboard');
      }
    }
    setLoading(false);
  };

  return (
    <AuthLayout
      title={isTechnicianFlow ? 'Technician sign in' : 'Business admin sign in'}
      subtitle={
        isTechnicianFlow
          ? 'Sign in to access technician logbook and reports.'
          : 'Sign in to access your compliance dashboard.'
      }
    >
      <form className={`space-y-6 page-fade-in ${error ? 'field-shake' : ''}`} onSubmit={handleSignIn}>
        <FormInput
          label="Email Address"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
        />
        <PasswordField
          label="Password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
        <div className="flex justify-between items-center text-sm text-zinc-600">
          <Link href="/auth/forgot-password" className="font-semibold text-primary-600 hover:text-primary-700">
            Forgot password?
          </Link>
        </div>
        {error ? <div className="form-feedback form-feedback-error">{error}</div> : null}
        {successMessage ? <div className="form-feedback form-feedback-success">{successMessage}</div> : null}
        <div className="flex justify-center">
          <Button type="submit" disabled={loading} size="sm">
            {loading ? (
              <>
                <span className="spinner"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </div>
        <div className="text-center text-sm text-zinc-600">
          Don&apos;t have an account?{' '}
          <Link
            href={isTechnicianFlow ? '/auth/signup?role=technician' : '/auth/signup'}
            className="font-semibold text-primary-600 hover:text-primary-700"
          >
            Create account
          </Link>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-900">
          {isTechnicianFlow ? (
            <>
              Technician access: use the exact email your admin added in the Technicians tab.{' '}
              <Link href="/auth/signin?role=admin" className="font-semibold text-primary-700 hover:text-primary-800">
                Admin sign in
              </Link>
            </>
          ) : (
            <>
              Need technician access?{' '}
              <Link href="/auth/signin?role=technician" className="font-semibold text-primary-700 hover:text-primary-800">
                Technician sign in
              </Link>
            </>
          )}
        </div>
        <div className="text-center text-xs text-zinc-500">
          Platform operator?{' '}
          <Link href="/auth/super-admin" className="font-semibold text-primary-600 hover:text-primary-700">
            Super admin login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

