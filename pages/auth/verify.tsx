import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AuthLayout from '../../components/layouts/AuthLayout';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';

export default function VerifyPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (typeof router.query.email === 'string') {
      setEmail(router.query.email);
    }
  }, [router.query.email]);

  const handleResend = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    const res = await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setErrorMessage(data?.error || 'Unable to send verification reminder.');
      showToast('Verification email failed', data?.error || 'Unable to send verification reminder.', 'error');
      return;
    }

    setSuccessMessage('Verification reminder sent. Check your inbox.');
    showToast('Verification reminder sent', 'Check your email inbox for the verification email.', 'success');
  };

  return (
    <AuthLayout title="Verify your email" subtitle="Check your inbox to confirm your account.">
      <div className="space-y-6">
        <p className="text-sm text-zinc-600">
          A verification email has been sent to <strong>{email || 'your email'}</strong>.
          Please click the link in that email to complete sign up.
        </p>
        <div className="rounded-2xl border border-zinc-200 bg-slate-50 p-5">
          <p className="text-sm text-zinc-700">Still not received it?</p>
          <p className="mt-2 text-sm text-zinc-600">Check your spam folder, then click the button below to resend a reminder.</p>
          {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
          {successMessage ? <p className="mt-3 text-sm text-emerald-600">{successMessage}</p> : null}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={handleResend} disabled={loading || !email}>
              {loading ? 'Sending...' : 'Resend verification email'}
            </Button>
            <Link href="/auth/signin" className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
