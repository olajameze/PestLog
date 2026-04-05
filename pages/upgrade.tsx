import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

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
  const [company, setCompany] = useState<Company | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [trialEndsDate, setTrialEndsDate] = useState<Date | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/signin');
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
  }, [router]);

  const handleSubscribe = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    setActionLoading(true);
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    if (res.ok && data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error || 'Unable to start checkout');
      setActionLoading(false);
    }
  };

  const handleManageSubscription = async () => {
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
      alert(data.error || 'Unable to open Stripe portal');
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-offwhite">Loading subscription details...</div>;
  }

  const isTrialActive = subscription?.status === 'trial' && trialDaysLeft > 0;

  return (
    <div className="min-h-screen bg-offwhite px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-navy mb-3">Upgrade to PestLog</h1>
          <p className="text-gray-600 mb-6">Keep your team active with PestLog subscription billing through Stripe.</p>

          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 hover-lift">
              <p className="text-sm text-gray-600">Plan:</p>
              <p className="text-xl font-semibold text-navy">PestLog Monthly</p>
              <p className="text-sm text-gray-600">Flat £35 / month</p>
            </div>

            {company && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 hover-lift">
                <p className="text-sm text-gray-600">Company</p>
                <p className="text-lg font-semibold text-navy">{company.name || company.email}</p>
              </div>
            )}

            <div className="rounded-2xl border border-gray-200 bg-white p-5 hover-lift">
              <p className="text-sm text-gray-600">Subscription</p>
              <p className="mt-2 text-base text-gray-800">Status: <span className="font-semibold">{subscription?.status || 'None'}</span></p>
              {trialEndsDate && trialDaysLeft > 0 && (
                <p className="mt-2 text-sm text-gray-600">Trial ends in {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'} ({trialEndsDate.toLocaleDateString()})</p>
              )}
              {subscription?.status !== 'active' && trialEndsDate && trialDaysLeft <= 0 && (
                <p className="mt-2 text-sm text-red-600">Your trial has ended. Please upgrade to continue using PestLog.</p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {subscription?.status === 'active' ? (
                <button onClick={handleManageSubscription} disabled={actionLoading} className="inline-flex justify-center items-center gap-2 rounded-2xl bg-green-600 px-6 py-3 text-white font-semibold hover:bg-green-700 disabled:opacity-50">
                  {actionLoading ? <><span className="spinner"></span> Opening portal...</> : 'Manage Subscription'}
                </button>
              ) : (
                <button onClick={handleSubscribe} disabled={actionLoading} className="inline-flex justify-center items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50">
                  {actionLoading ? <><span className="spinner"></span> Redirecting...</> : 'Upgrade Now'}
                </button>
              )}
              <button onClick={() => router.push('/dashboard')} className="inline-flex justify-center rounded-2xl border border-gray-300 bg-white px-6 py-3 text-gray-700 hover:bg-gray-50">
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}