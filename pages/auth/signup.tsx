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
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();
  const { showToast } = useToast();
  const role = typeof router.query.role === 'string' ? router.query.role : 'admin';
  const isTechnicianSignup = role === 'technician';

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: isTechnicianSignup
          ? `${window.location.origin}/technician`
          : `${window.location.origin}/dashboard`,
        data: {
          businessName: isTechnicianSignup ? '' : businessName,
          fullName,
        },
      },
    });
    if (error) {
      setError(error.message);
      showToast('Sign up failed', error.message, 'error');
    } else {
      setSuccessMessage('Account created. Check your email for verification instructions.');
      showToast('Account created', 'Verification email sent.', 'success');
      try {
        await fetch('/api/auth/welcome', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, fullName, businessName }),
        });
      } catch (sendError) {
        console.error('Welcome email failed', sendError);
      }
      router.push(`/auth/verify?email=${encodeURIComponent(email)}`);
    }
    setLoading(false);
  };

  return (
    <AuthLayout
      title={isTechnicianSignup ? 'Create technician account' : 'Create your account'}
      subtitle={
        isTechnicianSignup
          ? 'Use the same email your admin added in the Technicians tab.'
          : 'No credit card required. Get started in 2 minutes.'
      }
    >
      {isTechnicianSignup ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Technician sign-up: your account email must match an existing technician record from your admin dashboard.
        </div>
      ) : null}
      <form className={`space-y-4 page-fade-in ${error ? 'field-shake' : ''}`} onSubmit={handleSignUp}>
        {!isTechnicianSignup ? (
          <FormInput
            label="Business Name"
            id="business-name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="ABC Pest Control Ltd"
            required
          />
        ) : null}
        <FormInput
          label={isTechnicianSignup ? 'Technician Full Name' : 'Your Full Name'}
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
        {error ? <div className="form-feedback form-feedback-error">{error}</div> : null}
        {successMessage ? <div className="form-feedback form-feedback-success">{successMessage}</div> : null}
        <div className="flex justify-center">
          <Button type="submit" disabled={loading} size="sm">
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </div>
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
      {!isTechnicianSignup ? (
        <p className="mt-2 text-center text-sm text-zinc-600">
          Joining as field staff?{' '}
          <Link href="/auth/signup?role=technician" className="font-semibold text-primary-600 hover:text-primary-700">
            Sign up as Technician
          </Link>
        </p>
      ) : (
        <p className="mt-2 text-center text-sm text-zinc-600">
          Creating an owner/admin account?{' '}
          <Link href="/auth/signup?role=admin" className="font-semibold text-primary-600 hover:text-primary-700">
            Switch to Business Sign-up
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}