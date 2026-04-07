import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';
import AuthLayout from '../../components/layouts/AuthLayout';
import FormInput from '../../components/ui/FormInput';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';

export default function SignUp() {
  const [businessName, setBusinessName] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { showToast } = useToast();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          businessName,
          fullName,
        },
      },
    });
    if (error) {
      setError(error.message);
      showToast('Sign up failed', error.message, 'error');
    } else {
      showToast('Account created', 'Check your email for a confirmation link.', 'success');
      router.push('/auth/signin');
    }
    setLoading(false);
  };

  return (
    <AuthLayout title="Start your free trial" subtitle="No credit card required. Get started in 2 minutes.">
      <div className="mb-5 flex justify-center">
        <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          14-day free trial
        </span>
      </div>
      <form className="space-y-4" onSubmit={handleSignUp}>
        <FormInput
          label="Business Name"
          id="business-name"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="ABC Pest Control Ltd"
          required
        />
        <FormInput
          label="Your Full Name"
          id="full-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="John Smith"
          required
        />
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
          placeholder="At least 8 characters"
          required
        />
        <FormInput
          label="Confirm Password"
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Re-enter your password"
          required
        />
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}
        <Button type="submit" disabled={loading} size="lg">
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-zinc-500">
        By creating an account, you agree to our Terms of Service and Privacy Policy.
      </p>
      <p className="mt-4 text-center text-sm text-zinc-600">
        Already have an account?{' '}
        <Link href="/auth/signin" className="font-semibold text-primary-600 hover:text-primary-700">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}