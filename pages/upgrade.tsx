import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/ToastProvider';
import { getClientSupportEmail } from '../lib/supportEmail';

type Company = {
  id: string;
  name?: string;
  email: string;
};

type Subscription = {
  status: string;
  trialEndsAt?: string;
  stripeCustomerId?: string;
};

export default function UpgradePage() {
  const router = useRouter();
  const supportAddr = getClientSupportEmail();
  const { showToast } = useToast();
  const isPreviewMode = process.env.NODE_ENV === 'development' && router.query.preview === '1';
  const [company, setCompany] = useState<Company | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'business' | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [trialEndsDate, setTrialEndsDate] = useState<Date | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (isPreviewMode) {
        const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        setCompany({ id: 'preview-company', name: 'Pest Trace Preview Co.', email: 'owner@preview.local' });
        setSubscription({ status: 'trial', trialEndsAt: endDate.toISOString() });
        setTrialEndsDate(endDate);
        setTrialDaysLeft(7);
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/signin');
        return;
      }
      const authUser = session.user as {
        email_confirmed_at?: string | null;
        confirmed_at?: string | null;
        email_confirmed?: boolean;
      };
      const userVerified = Boolean(authUser.email_confirmed_at ?? authUser.confirmed_at ?? authUser.email_confirmed);
      if (!userVerified) {
        router.push(`/auth/verify?email=${encodeURIComponent(session.user.email ?? '')}`);
        return;
      }

      const companyRes = await fetch('/api/company', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (companyRes.ok) {
        const companyData = await companyRes.json();
        setCompany(companyData);
      }

      const subscriptionRes = await fetch('/api/subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!subscriptionRes.ok) {
        router.push('/dashboard');
        return;
      }

      const subscriptionData = await subscriptionRes.json();
      setSubscription(subscriptionData);
      
      // Calculate trial days left safely (only once, after data loads)
      if (subscriptionData.trialEndsAt) {
        const endDate = new Date(subscriptionData.trialEndsAt);
        setTrialEndsDate(endDate);
        const now = new Date(); // safe inside useEffect
        const days = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        setTrialDaysLeft(days);
      }
      
      setLoading(false);
    };

    loadData();
  }, [isPreviewMode, router]);

  const handleSubscribe = async (plan: 'pro' | 'business') => {
    if (isPreviewMode) {
      showToast('Preview mode', 'Checkout is disabled in preview mode.', 'info');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    setActionLoading(true);
    setSelectedPlan(plan);
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (res.ok && data.url) {
      window.location.href = data.url;
    } else {
      showToast('Checkout failed', data.error || 'Unable to start checkout', 'error');
      setActionLoading(false);
      setSelectedPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    if (isPreviewMode) {
      showToast('Preview mode', 'Billing portal is disabled in preview mode.', 'info');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    setActionLoading(true);
    const res = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (res.ok && data.url) {
      window.location.href = data.url;
    } else {
      showToast('Portal failed', data.error || 'Unable to open Stripe portal', 'error');
      setActionLoading(false);
      setSelectedPlan(null);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-offwhite">Loading subscription details...</div>;
  }

  return (
    <div className="min-h-screen bg-offwhite px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-navy mb-2">Upgrade to Pest Trace</h1>
          <p className="text-sm sm:text-base text-gray-600">Choose a plan for your team. Unlock Reports, Dashboard, and Pro features.</p>
        </div>

        {/* Status Cards */}
        <div className="space-y-3">
          {company && (
            <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 hover-lift">
              <p className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">Company</p>
              <p className="mt-2 text-lg sm:text-xl font-semibold text-navy">{company.name || company.email}</p>
            </div>
          )}

          {/* Subscription Status Card */}
          <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-6 hover-lift">
            <p className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">Subscription Status</p>
            <div className="mt-3 space-y-2">
              <p className="text-base sm:text-lg text-gray-800">
                Status: <span className="font-bold text-navy">{subscription?.status || 'None'}</span>
              </p>
              {trialEndsDate && trialDaysLeft > 0 && (
                <p className="text-sm text-gray-600">
                  ✓ Access ends in <strong>{trialDaysLeft}</strong> day{trialDaysLeft === 1 ? '' : 's'} <span className="text-gray-500">({trialEndsDate.toLocaleDateString()})</span>
                  {trialDaysLeft <= 2 && (
                    <p className="mt-1 text-sm font-semibold text-orange-600">
                      ⏰ Access ending soon! Upgrade now to retain full Pest Trace access.
                    </p>
                  )}
                </p>
              )}
              {subscription?.status !== 'active' && trialEndsDate && trialDaysLeft <= 0 && (
                <p className="text-sm font-semibold text-red-600">
                  ⚠️ Access expired. Upgrade now to regain full Pest Trace access.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-navy">Pro</h2>
            <p className="mt-2 text-2xl font-bold text-primary-600">£25<span className="text-sm font-medium text-zinc-500">/month per user</span></p>
            <button
              onClick={() => handleSubscribe('pro')}
              disabled={actionLoading}
              className="btn btn-primary mt-6 w-full"
            >
              {actionLoading && selectedPlan === 'pro' ? 'Redirecting...' : 'Choose Pro'}
            </button>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-navy">Business</h2>
            <p className="mt-2 text-2xl font-bold text-primary-600">£40<span className="text-sm font-medium text-zinc-500">/month per user</span></p>
            <button
              onClick={() => handleSubscribe('business')}
              disabled={actionLoading}
              className="btn btn-primary mt-6 w-full"
            >
              {actionLoading && selectedPlan === 'business' ? 'Redirecting...' : 'Choose Business'}
            </button>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-navy">Enterprise</h2>
            <p className="mt-2 text-lg font-semibold text-zinc-700">Custom pricing</p>
            <a
              href={`mailto:${supportAddr}?subject=${encodeURIComponent('Pest Trace Enterprise Enquiry')}`}
              className="btn btn-secondary mt-6 w-full inline-flex items-center justify-center"
            >
              Contact Sales
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          {subscription?.status === 'active' ? (
            <button onClick={handleManageSubscription} disabled={actionLoading} className="btn btn-success hover:shadow-md hover-lift">
              {actionLoading ? 'Opening portal...' : 'Manage Subscription'}
            </button>
          ) : null}
          <button className="btn btn-secondary hover:shadow-md hover-lift" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </button>
          <button 
            className="btn btn-danger hover:shadow-md hover-lift" 
            onClick={async () => {
              if (!confirm('⚠️ PERMANENT account deletion!\\n\\nCancels subscription, deletes ALL data (jobs, photos, techs, certs, reports). Cannot be undone.\\n\\nAre you 100% sure?')) return;
              if (!confirm('FINAL WARNING: All data LOST FOREVER. Type DELETE to continue.')) return;
              if ((prompt('Type DELETE to confirm:') || '').toUpperCase() !== 'DELETE') return;
              
              try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch('/api/account/delete', {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${session?.access_token}` },
                });
                if (res.ok) {
                  showToast('Deleted', 'Account, data, and subscription permanently removed.', 'success');
                  router.push('/');
                } else {
                  const err = await res.json();
                  showToast('Failed', err.error || 'Delete failed', 'error');
                }
              } catch {
                showToast('Error', 'Delete failed', 'error');
              }
            }}
          >
            🗑️ Delete Account & Cancel Sub
          </button>
        </div>
      </div>
    </div>
  );
}

