import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import AuthLayout from '../../components/layouts/AuthLayout';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import { useToast } from '../../components/ui/ToastProvider';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { showToast } = useToast();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const redirectUrl = `${window.location.origin}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      setErrorMessage(error.message);
      showToast('Password recovery failed', error.message, 'error');
    } else {
      setSuccessMessage(
        'If the email exists, a recovery message has been sent. Check your inbox and follow the secure reset link.'
      );
      showToast('Recovery email sent', 'Please check your email to reset your password.', 'success');
    }

    setLoading(false);
  };

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we will send a secure password recovery link."
    >
      <form onSubmit={handleSubmit} className="space-y-6 page-fade-in">
        <FormInput
          label="Email Address"
          id="forgot-password-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
        />

        {errorMessage ? <div className="form-feedback form-feedback-error">{errorMessage}</div> : null}
        {successMessage ? (
          <div className="form-feedback form-feedback-success">{successMessage}</div>
        ) : null}

        <div className="flex justify-center">
          <Button type="submit" disabled={loading} size="sm">
            {loading ? (
              <>
                <span className="spinner"></span>
                Sending recovery email...
              </>
            ) : (
              'Send recovery email'
            )}
          </Button>
        </div>

        <div className="text-center text-sm text-zinc-600">
          Remembered your password?{' '}
          <Link href="/auth/signin" className="font-semibold text-primary-600 hover:text-primary-700">
            Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
