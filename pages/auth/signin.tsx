import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';
import AuthLayout from '../../components/layouts/AuthLayout';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import { useToast } from '../../components/ui/ToastProvider';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();
  const { showToast } = useToast();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      showToast('Sign in failed', error.message, 'error');
    } else {
      setSuccessMessage('Signed in successfully. Redirecting to dashboard...');
      showToast('Signed in', 'Redirecting to dashboard', 'success');
      router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <AuthLayout title="Welcome back to PestLog" subtitle="Sign in to access your compliance dashboard">
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
        <FormInput
          label="Password"
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
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
          <Link href="/auth/signup" className="font-semibold text-primary-600 hover:text-primary-700">
            Start free trial
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}

