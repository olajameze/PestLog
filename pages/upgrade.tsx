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
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-navy mb-2">Upgrade to PestLog</h1>
          <p className="text-sm sm:text-base text-gray-600">Keep your team active with PestLog subscription billing through Stripe.</p>
        </div>

        {/* Info Cards */}
        <div className="space-y-3">
          {/* Plan Card */}
          <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 hover-lift">
            <p className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wide">Plan</p>
            <p className="mt-2 text-lg sm:text-2xl font-bold text-navy">PestLog Monthly</p>
            <p className="mt-1 text-base sm:text-lg font-semibold text-blue-600">£35 / month</p>
          </div>

          {/* Company Card */}
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
                  ✓ Trial ends in <strong>{trialDaysLeft}</strong> day{trialDaysLeft === 1 ? '' : 's'} <span className="text-gray-500">({trialEndsDate.toLocaleDateString()})</span>
                </p>
              )}
              {subscription?.status !== 'active' && trialEndsDate && trialDaysLeft <= 0 && (
                <p className="text-sm font-semibold text-red-600">
                  ⚠️ Your trial has ended. Please upgrade to continue using PestLog.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          {subscription?.status === 'active' ? (
            <>
              <button 
                onClick={handleManageSubscription} 
                disabled={actionLoading} 
                className="btn btn-success hover:shadow-md hover-lift"
              >
                {actionLoading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Opening portal...</span>
                  </>
                ) : (
                  'Manage Subscription'
                )}
              </button>
              <button 
                onClick={() => router.push('/dashboard')} 
                className="btn btn-secondary hover:shadow-md hover-lift"
              >
                Back to Dashboard
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleSubscribe} 
                disabled={actionLoading} 
                className="btn btn-primary hover:shadow-md hover-lift"
              >
                {actionLoading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Redirecting...</span>
                  </>
                ) : (
                  'Upgrade Now'
                )}
              </button>
              <button 
                onClick={() => router.push('/dashboard')} 
                className="btn btn-secondary hover:shadow-md hover-lift"
              >
                Back to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}