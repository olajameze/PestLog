import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';
import { sanitizeInternalNextPath } from '../../lib/authRedirect';
import AuthLayout from '../../components/layouts/AuthLayout';

const REDIRECT_WAIT_MS = 15000;

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const next = sanitizeInternalNextPath(
      typeof router.query.next === 'string' ? router.query.next : undefined
    );

    let finished = false;
    const go = () => {
      if (finished) return;
      finished = true;
      void router.replace(next);
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        go();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        go();
      }
    });

    const timeout = window.setTimeout(() => {
      if (!finished) {
        setStatus('error');
      }
    }, REDIRECT_WAIT_MS);

    return () => {
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [router, router.isReady, router.query.next]);

  if (status === 'error') {
    return (
      <AuthLayout
        title="Sign-in link expired or invalid"
        subtitle="We could not finish signing you in from this link. Try signing in again, or complete business registration with the code from your email."
      >
        <div className="space-y-4 text-center text-sm text-zinc-600">
          <p>If you were verifying a new account, open the sign-up page and enter the one-time code we emailed you.</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/auth/signin"
              className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Sign up
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Finishing sign-in…" subtitle="Please wait while we redirect you.">
      <p className="text-center text-sm text-zinc-500">This usually takes a few seconds.</p>
    </AuthLayout>
  );
}
