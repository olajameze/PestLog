import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AuthLayout from '../../components/layouts/AuthLayout';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import { useToast } from '../../components/ui/ToastProvider';

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function VerifyPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const routerEmail =
    router.isReady && typeof router.query.email === 'string' ? router.query.email : '';
  const [editedEmail, setEditedEmail] = useState<string | null>(null);
  const email = editedEmail !== null ? editedEmail : routerEmail;
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleResend = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!validEmail(email)) {
      setErrorMessage('Enter the email you used to sign up so we can resend verification.');
      return;
    }
    setLoading(true);

    const res = await fetch('/api/auth/send-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setErrorMessage(data?.error || 'Unable to send verification reminder.');
      showToast('Verification email failed', data?.error || 'Unable to send verification reminder.', 'error');
      return;
    }

    const base = 'If the message does not arrive within a few minutes, check spam or try again in a few minutes.';
    setSuccessMessage(data?.warning ? `${data.warning} ${base}` : `Verification email sent. ${base}`);
    showToast(
      'Verification email sent',
      typeof data?.warning === 'string' ? data.warning : 'Check your email inbox for the verification link.',
      'success'
    );
  };

  return (
    <AuthLayout title="Verify your email" subtitle="Check your inbox to confirm your account.">
      <div className="space-y-6">
        <p className="text-sm text-zinc-600">
          A verification email has been sent to <strong>{email.trim() ? email.trim() : 'your email'}</strong>.
          Please click the link in that email to complete sign up.
        </p>
        <div className="rounded-2xl border border-zinc-200 bg-slate-50 p-5">
          <p className="text-sm text-zinc-700">Wrong address or no email in the link?</p>
          <p className="mt-2 text-sm text-zinc-600">Enter the email you registered with, then resend the verification message.</p>
          <div className="mt-4">
            <FormInput
              label="Account email"
              id="verify-email"
              type="email"
              value={email}
              onChange={(e) => setEditedEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <p className="mt-3 text-xs text-zinc-500">We will send a new confirmation message from our auth provider when possible.</p>
          {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}
          {successMessage ? <p className="mt-3 text-sm text-emerald-600">{successMessage}</p> : null}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button type="button" onClick={handleResend} disabled={loading || !email.trim()}>
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
