import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import AuthLayout from '../../components/layouts/AuthLayout';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import { useToast } from '../../components/ui/ToastProvider';

export default function ResetPassword() {
  const { showToast } = useToast();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const recoveryValidation = useMemo(() => {
    if (!router.isReady) {
      return {
        checked: false,
        validRecoveryLink: true,
        invalidLinkMessage: '',
      };
    }

    const type = typeof router.query.type === 'string' ? router.query.type : undefined;
    const accessToken = typeof router.query.access_token === 'string' ? router.query.access_token : undefined;

    if (type !== 'recovery' || !accessToken) {
      return {
        checked: true,
        validRecoveryLink: false,
        invalidLinkMessage: 'This reset link is invalid or incomplete. Please request a new one.',
      };
    }

    return {
      checked: true,
      validRecoveryLink: true,
      invalidLinkMessage: '',
    };
  }, [router.isReady, router.query.type, router.query.access_token]);

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!recoveryValidation.validRecoveryLink) {
      setErrorMessage('Invalid or expired password recovery link.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message);
      showToast('Password reset failed', error.message, 'error');
    } else {
      setSuccessMessage('Your password has been updated. You can now sign in with the new password.');
      showToast('Password updated', 'Please sign in with your new password.', 'success');
      setPassword('');
      setConfirmPassword('');
    }

    setLoading(false);
  };

  if (recoveryValidation.checked && recoveryValidation.invalidLinkMessage) {
    return (
      <AuthLayout title="Invalid reset link" subtitle="Please request a new recovery email to reset your password.">
        <div className="space-y-6 page-fade-in">
          <div className="form-feedback form-feedback-error">{recoveryValidation.invalidLinkMessage}</div>
          <div className="text-sm text-zinc-600">
            <Link href="/auth/forgot-password" className="font-semibold text-primary-600 hover:text-primary-700">
              Request a new recovery link
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Create a new secure password to regain access.">
      <form onSubmit={handleReset} className="space-y-6 page-fade-in">
        <FormInput
          label="New password"
          id="reset-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New secure password"
          required
        />
        <FormInput
          label="Confirm password"
          id="reset-password-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          required
        />

        {errorMessage ? <div className="form-feedback form-feedback-error">{errorMessage}</div> : null}
        {successMessage ? (
          <div className="form-feedback form-feedback-success">{successMessage}</div>
        ) : null}

        <div className="text-sm text-slate-500">
          Your new password should be at least 8 characters and hard to guess.
        </div>

        <div className="flex justify-center">
          <Button type="submit" disabled={loading} size="sm">
            {loading ? (
              <>
                <span className="spinner"></span>
                Resetting password...
              </>
            ) : (
              'Reset password'
            )}
          </Button>
        </div>

        <div className="text-center text-sm text-zinc-600">
          Back to{' '}
          <Link href="/auth/signin" className="font-semibold text-primary-600 hover:text-primary-700">
            Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
