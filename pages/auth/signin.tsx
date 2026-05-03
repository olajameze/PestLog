import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';
import AuthLayout from '../../components/layouts/AuthLayout';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import PasswordField from '../../components/ui/PasswordField';
import { useToast } from '../../components/ui/ToastProvider';

export default function SignIn() {
  const router = useRouter();
  const role = typeof router.query.role === 'string' ? router.query.role : 'admin';
  const isTechnicianFlow = role === 'technician';
  const inviteEmail = typeof router.query.email === 'string' ? decodeURIComponent(router.query.email) : '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const { showToast } = useToast();
  const otpCooldownRaw = Number(process.env.NEXT_PUBLIC_OTP_RESEND_COOLDOWN_SECONDS ?? '30');
  const otpCooldownSeconds = Number.isFinite(otpCooldownRaw) && otpCooldownRaw > 0 ? otpCooldownRaw : 30;
  const resolvedEmail = email || inviteEmail;

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const interval = window.setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [resendCountdown]);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    const { data, error } = await supabase.auth.signInWithPassword({
      email: resolvedEmail.trim(),
      password,
    });
    if (error) {
      setError(error.message);
      showToast('Sign in failed', error.message, 'error');
    } else if (!data.session) {
      setSuccessMessage('Please verify your email before accessing the dashboard.');
      showToast('Email verification required', 'Check your inbox or resend verification from the next screen.', 'info');
      router.push(`/auth/verify?email=${encodeURIComponent(resolvedEmail)}`);
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
        router.push(`/auth/verify?email=${encodeURIComponent(resolvedEmail)}`);
        setLoading(false);
        return;
      }
      setSuccessMessage('Signed in successfully. Redirecting to dashboard...');
      showToast('Signed in', 'Redirecting to dashboard', 'success');
      router.push('/dashboard');
    }
    setLoading(false);
  };

  const sendTechnicianCode = async () => {
    const normalizedEmail = resolvedEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Enter your technician email first.');
      return;
    }

    setSendingOtp(true);
    setError('');
    setSuccessMessage('');

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
      },
    });

    if (otpError) {
      setError(otpError.message);
      showToast('Code send failed', otpError.message, 'error');
      setSendingOtp(false);
      return;
    }

    setOtpSent(true);
    setResendCountdown(otpCooldownSeconds);
    setSuccessMessage('A one-time code was sent to your email. Enter it below to sign in.');
    showToast('Code sent', 'Check your inbox for your one-time code.', 'success');
    setSendingOtp(false);
  };

  const verifyTechnicianCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = resolvedEmail.trim().toLowerCase();
    if (!normalizedEmail || !otpCode.trim()) {
      setError('Enter both email and one-time code.');
      return;
    }

    setVerifyingOtp(true);
    setError('');
    setSuccessMessage('');

    const { data, error: otpError } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: otpCode.trim(),
      type: 'email',
    });

    if (otpError || !data.session) {
      const message = otpError?.message || 'Invalid or expired one-time code.';
      setError(message);
      showToast('Verification failed', message, 'error');
      setVerifyingOtp(false);
      return;
    }

    setSuccessMessage('Signed in successfully. Redirecting to technician workspace...');
    showToast('Signed in', 'Redirecting to technician workspace', 'success');
    setVerifyingOtp(false);
    await router.push('/technician');
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
      <form
        className={`space-y-6 page-fade-in ${error ? 'field-shake' : ''}`}
        onSubmit={isTechnicianFlow ? verifyTechnicianCode : handleAdminSignIn}
      >
        <FormInput
          label="Email Address"
          id="email"
          type="email"
          value={resolvedEmail}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
        />
        {isTechnicianFlow ? (
          <>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
              Technician login uses one-time passcode only. Password sign-in is disabled for technicians.
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={sendTechnicianCode}
                disabled={sendingOtp || resendCountdown > 0}
                size="sm"
              >
                {sendingOtp
                  ? 'Sending code...'
                  : resendCountdown > 0
                  ? `Resend in ${resendCountdown}s`
                  : otpSent
                  ? 'Resend code'
                  : 'Send code'}
              </Button>
            </div>
            <FormInput
              label="One-Time Code"
              id="otp-code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="Enter 6-digit code"
              required
            />
          </>
        ) : (
          <>
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
          </>
        )}
        {error ? <div className="form-feedback form-feedback-error">{error}</div> : null}
        {successMessage ? <div className="form-feedback form-feedback-success">{successMessage}</div> : null}
        <div className="flex justify-center">
          <Button type="submit" disabled={loading || verifyingOtp || (isTechnicianFlow && !otpSent)} size="sm">
            {loading || verifyingOtp ? (
              <>
                <span className="spinner"></span>
                {isTechnicianFlow ? 'Verifying...' : 'Signing in...'}
              </>
            ) : isTechnicianFlow ? (
              'Verify Code'
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

