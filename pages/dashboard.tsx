import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import Sidebar from '../components/sidebar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import SettingsTab from '../components/settings/SettingsTab';
import DashboardEnhancements from '../components/dashboard/DashboardEnhancements';
import { useToast } from '../components/ui/ToastProvider';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { checkPlan } from '../lib/planGuard';

interface User {
  id: string;
  email?: string;
}

interface Company {
  id: string;
  name?: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
  vatNumber?: string | null;
  requireSignature: boolean;
  requirePhotos: boolean;
  defaultReportRangeDays?: number | null;
  notificationPreferences?: {
    trialExpiry?: boolean;
    renewal?: boolean;
    certificationExpiry?: boolean;
    apiKey?: string;
  } | null;
  subscriptionStatus: string;
  trialEndsAt?: string | null;
  plan?: string;
}

interface Technician {
  id: string;
  name: string;
  email: string;
}

interface Subscription {
  status: string;
  trialEndsAt?: string;
  stripeCustomerId?: string;
  plan?: string;
}

interface BaitStationForm {
  stationId: string;
  location: string;
  baitType?: string;
  amount?: string;
}

interface LogbookEntry {
  id: string;
  date: string;
  clientName: string;
  address: string;
  treatment: string;
  notes?: string;
  photoUrl?: string;
  photoUrls?: string[];
  photos?: { url: string }[];
  signature?: string;
  rooms?: Array<string | { name: string; note?: string }>;
  baitBoxesPlaced?: string;
  poisonUsed?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
  logbookEntryTechnicians?: { technician: { name: string } }[];
  followUpDate?: string;
  internalNotes?: string;
  productAmount?: string;
  recommendation?: string;
  baitStations?: BaitStationForm[];
}

function isRenderableImageSrc(value: string): boolean {
  return (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('blob:') ||
    value.startsWith('data:') ||
    value.startsWith('/')
  );
}

function parsePhotoUrls(photoUrl?: string, photoUrls?: string[], photos?: { url: string }[]): string[] {
  if (Array.isArray(photos) && photos.length > 0) {
    return photos.map((photo) => photo.url).filter((url) => Boolean(url) && isRenderableImageSrc(url)).slice(0, 4);
  }
  if (Array.isArray(photoUrls) && photoUrls.length > 0) {
    return photoUrls.filter((url) => isRenderableImageSrc(url)).slice(0, 4);
  }
  if (!photoUrl) return [];
  try {
    const parsed = JSON.parse(photoUrl);
    if (Array.isArray(parsed)) {
      return parsed.filter((value): value is string => typeof value === 'string' && isRenderableImageSrc(value)).slice(0, 4);
    }
  } catch {
    // Not JSON; treat as single URL.
  }
  return isRenderableImageSrc(photoUrl) ? [photoUrl] : [];
}

function supabaseImageLoader({ src }: { src: string }): string {
  return src;
}

function renderRoomDetails(rooms?: Array<string | { name: string; note?: string }>) {
  if (!rooms?.length) return null;
  return (
    <div className="mt-4 grid gap-3">
      {rooms.map((room, index) => {
        const name = typeof room === 'string' ? room : room.name;
        const note = typeof room === 'string' ? '' : room.note;
        return (
          <div key={`room-${index}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-sm font-semibold text-navy">{name}</p>
            {note ? <p className="mt-1 text-sm text-zinc-600 whitespace-pre-line">{note}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

type Tab = 'technicians' | 'logbook' | 'settings';

// ========== PlanModal Component ==========
const PlanModal = ({ onClose, onSubscribe }: { onClose: () => void; onSubscribe: (plan: 'pro' | 'business') => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-navy">Choose Your Plan</h2>
        <Button size="sm" variant="secondary" onClick={onClose}>✕</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Pro */}
        <div className="border-2 border-blue-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-lg transition-all">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-semibold text-blue-700">Recommended</span>
          </div>
          <h3 className="text-xl font-bold text-navy mb-2">Pro</h3>
          <div className="text-3xl font-bold text-primary-600 mb-4">£25<span className="text-xl">/month</span></div>
          <ul className="space-y-2 mb-6 text-sm text-zinc-600">
            <li>• Unlimited logbook entries</li>
            <li>• PDF compliance reports</li>
            <li>• Technician certifications</li>
            <li>• PWA offline mode</li>
          </ul>
          <Button onClick={() => { onClose(); onSubscribe('pro'); }} className="w-full">Choose Pro (£25/mo)</Button>
        </div>
        {/* Business */}
        <div className="border-2 border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-lg transition-all">
          <h3 className="text-xl font-bold text-navy mb-2">Business</h3>
          <div className="text-3xl font-bold text-primary-600 mb-4">£40<span className="text-xl">/month</span></div>
          <ul className="space-y-2 mb-6 text-sm text-zinc-600">
            <li>• Everything in Pro</li>
            <li>• Multi-company support</li>
            <li>• Advanced reporting</li>
            <li>• API access</li>
            <li>• Priority support</li>
          </ul>
          <Button variant="secondary" onClick={() => { onClose(); onSubscribe('business'); }} className="w-full">Choose Business (£40/mo)</Button>
        </div>
      </div>
      <div className="text-center text-sm text-zinc-500 mb-4">Your subscription starts immediately.</div>
      <div className="flex gap-3 justify-center">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  </div>
);

// ========== Dashboard Component ==========
export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [activeTab, setActiveTab] = useState<'technicians' | 'logbook' | 'settings'>('technicians');
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const [trialBanner, setTrialBanner] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [showCertModal, setShowCertModal] = useState(false);
  const [technicianCerts, setTechnicianCerts] = useState<Certification[]>([]);
  const [certFile, setCertFile] = useState<{ file: File; dataUrl: string; contentType: string } | null>(null);
  const [certExpiry, setCertExpiry] = useState('');
  const [certLoading, setCertLoading] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();
  const isPreviewMode = process.env.NODE_ENV === 'development' && router.query.preview === '1';

  const isPro = company
    ? checkPlan(company.plan ?? 'trial', ['pro', 'business', 'enterprise']) || company.subscriptionStatus === 'active'
    : false;

  const handleRequestDeleteAccount = () => {
    setShowDeleteAccountConfirm(true);
  };

  const handleDeleteAccount = async () => {
    if (isPreviewMode) {
      showToast('Preview mode', 'Account deletion is disabled in preview mode.', 'info');
      setShowDeleteAccountConfirm(false);
      return;
    }

    setDeletingAccount(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setDeletingAccount(false);
      router.push('/auth/signin');
      return;
    }

    const res = await fetch('/api/account/delete', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    const data = await res.json();
    if (res.ok) {
      await supabase.auth.signOut();
      showToast('Account deleted', 'Your account and all data have been deleted. Sign up again to create a new account.', 'success');
      router.push('/auth/signup');
    } else {
      showToast('Delete failed', data?.error || 'Unable to delete account.', 'error');
    }

    setDeletingAccount(false);
    setShowDeleteAccountConfirm(false);
  };

  const handleCertUpload = async () => {
    if (!selectedTechId || !certFile || !company) {
      showToast('Invalid upload', 'Select technician and file', 'error');
      return;
    }

    setCertLoading(true);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      showToast('Upload failed', 'Unable to verify your session. Please refresh and try again.', 'error');
      console.error('Cert upload failed: no session', sessionError);
      setCertLoading(false);
      return;
    }

    const sanitizedFileName = certFile.file.name
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-._]/g, '');
    const filePath = `${selectedTechId}/cert-${Date.now()}-${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('logbook-photos')
      .upload(filePath, certFile.file, {
        cacheControl: '3600',
        contentType: certFile.file.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      showToast('Upload failed', uploadError.message || 'Storage upload failed', 'error');
      console.error('Cert upload failed:', uploadError);
      setCertLoading(false);
      return;
    }

    const res = await fetch('/api/technicians/certifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        technicianId: selectedTechId,
        expiryDate: certExpiry || undefined,
        fileUrl: filePath,
      }),
    });

    if (res.ok) {
      showToast('Success', 'Certification uploaded', 'success');
      setShowCertModal(false);
      setCertFile(null);
      setCertExpiry('');
      const certRes = await fetch(`/api/technicians/${selectedTechId}/certifications`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (certRes.ok) {
        setTechnicianCerts(await certRes.json());
      }
    } else {
      const err = await res.json().catch(() => ({ error: 'Server error' }));
      showToast('Upload failed', err.error || err.message || 'Try again', 'error');
      console.error('Cert upload error:', err, 'status', res.status);
    }
    setCertLoading(false);
  };

  const loadTechCerts = async (techId: string) => {
    if (!company?.id) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(`/api/technicians/${techId}/certifications`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (res.ok) {
      const certs = await res.json();
      const signedPromises = certs.map(async (cert: Certification) => {
        const path = cert.fileUrl; // already path
        const { data, error } = await supabase.storage
          .from('logbook-photos')
          .createSignedUrl(path, 3600);

        if (error || !data?.signedUrl) {
          console.error('Failed to create cert signed URL:', error);
          return {
            ...cert,
            signedUrl: cert.fileUrl,
          };
        }

        return { ...cert, signedUrl: data.signedUrl };
      });
      const certsWithSigned = await Promise.all(signedPromises);
      setTechnicianCerts(certsWithSigned);
      setSelectedTechId(techId);
    }
  };

  useEffect(() => {
    const getUser = async () => {
      if (isPreviewMode) {
        setUser({ id: 'preview-user', email: 'preview@pesttrace.local' });
        setCompany({
          id: 'preview-company',
          name: 'Pest Trace Preview Co.',
          email: 'owner@preview.local',
          requireSignature: false,
          requirePhotos: false,
          notificationPreferences: {
            trialExpiry: true,
            renewal: true,
            certificationExpiry: true,
          },
          subscriptionStatus: 'active',
        });
        setTechnicians([
          { id: 'tech-1', name: 'John Smith', email: 'john@preview.local' },
          { id: 'tech-2', name: 'Sarah Johnson', email: 'sarah@preview.local' },
        ]);
        setSubscription({ status: 'active' });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/signin');
        return;
      }
      setUser(session.user);
      const res = await fetch('/api/company', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const companyData = await res.json();
      if (!res.ok) {
        setAppError(companyData?.error || 'Unable to load company details.');
        showToast('Load failed', companyData?.error || 'Unable to load company details.', 'error');
      } else {
        setCompany(companyData);
      }
      if (companyData) {
        const techRes = await fetch('/api/technicians', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const techData = await techRes.json();
        setTechnicians(Array.isArray(techData) ? techData : []);
        if (!techRes.ok) {
          setAppError(techData?.error || 'Unable to load technicians.');
          showToast('Load failed', techData?.error || 'Unable to load technicians.', 'error');
        }

        const subRes = await fetch('/api/subscription', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscription(subData);
          const now = Date.now();
          const trialExpiresAt = subData.trialEndsAt ? new Date(subData.trialEndsAt) : null;
          const trialExpired = !trialExpiresAt || trialExpiresAt.getTime() < now;

          if (subData.status !== 'active' && trialExpired) {
            router.replace('/upgrade');
            return;
          }

          if (subData.status !== 'active' && trialExpiresAt && trialExpiresAt.getTime() > now) {
            const daysLeft = Math.max(0, Math.ceil((trialExpiresAt.getTime() - now) / (1000 * 60 * 60 * 24)));
            if (daysLeft <= 3) {
              setTrialBanner(trialExpiresAt.toLocaleDateString());
            } else {
              setTrialBanner(null);
            }
          } else {
            setTrialBanner(null);
          }
        }
      }

      const cleanedQuery = { ...router.query };
      const queryPlan = typeof router.query.upgradedPlan === 'string' ? router.query.upgradedPlan : undefined;

      if (queryPlan && (queryPlan === 'pro' || queryPlan === 'business')) {
        const planLabel = queryPlan.charAt(0).toUpperCase() + queryPlan.slice(1);
        showToast(
          'Subscription active',
          `You upgraded to ${planLabel}. Your ${queryPlan === 'business' ? 'business reporting and analytics' : 'Pro reports and certifications'} are now available.`,
          'success'
        );
        await router.replace('/reports');
        return;
      }

      if (router.query.session_id) {
        delete cleanedQuery.session_id;
        delete cleanedQuery.upgradedPlan;
        router.replace(
          { pathname: router.pathname, query: cleanedQuery },
          undefined,
          { shallow: true }
        );
      }
    };
    getUser();
  }, [isPreviewMode, router, showToast, router.query.session_id, router.query.upgradedPlan]);

  const tabQuery = router.query.tab;
  const currentTab: Tab =
    tabQuery === 'technicians' || tabQuery === 'logbook' || tabQuery === 'settings'
      ? tabQuery
      : activeTab;

  const handleSignOut = async () => {
    if (isPreviewMode) {
      router.push('/');
      return;
    }
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleSubscribe = async (plan: 'pro' | 'business') => {
    if (isPreviewMode) {
      showToast('Preview mode', 'Checkout is disabled in preview mode.', 'info');
      return;
    }
    setLoadingCheckout(true);
    setAppError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    const token = session.access_token;

    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (res.ok && data.url) {
      window.location.href = data.url;
    } else {
      setAppError(data.error || 'Unable to start checkout. Please try again.');
      showToast('Checkout failed', data.error || 'Unable to start checkout. Please try again.', 'error');
      setLoadingCheckout(false);
    }
  };

  const handleManageSubscription = async () => {
    if (isPreviewMode) {
      showToast('Preview mode', 'Billing portal is disabled in preview mode.', 'info');
      return;
    }
    setLoadingPortal(true);
    setAppError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    const token = session.access_token;

    const res = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok && data.url) {
      window.location.href = data.url;
    } else {
      setAppError(data.error || 'Unable to open customer portal.');
      showToast('Portal failed', data.error || 'Unable to open customer portal.', 'error');
      setLoadingPortal(false);
    }
  };

  const handleGenerateApiKey = async (): Promise<string | null> => {
    if (isPreviewMode) {
      showToast('Preview mode', 'Cannot generate API key in preview mode.', 'info');
      return null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/signin');
      return null;
    }

    const res = await fetch('/api/enterprise/api-key', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    const result = await res.json();
    if (!res.ok) {
      showToast('API key failed', result.error || 'Unable to generate API key.', 'error');
      return null;
    }
    showToast('API key generated', 'Your enterprise API key is ready.', 'success');
    return result.apiKey || null;
  };

  const handleUpdateCompanySettings = async (settings: {
    name: string;
    phone?: string;
    address?: string;
    website?: string;
    vatNumber?: string;
    requireSignature: boolean;
    requirePhotos: boolean;
    defaultReportRangeDays: number;
    notificationPreferences: {
      trialExpiry: boolean;
      renewal: boolean;
      certificationExpiry: boolean;
      apiKey?: string;
    };
  }) => {
    if (!company) return;

    setSavingSettings(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/signin');
      setSavingSettings(false);
      return;
    }

    const existingApiKey = company.notificationPreferences?.apiKey;
    const payload = {
      ...settings,
      notificationPreferences: {
        ...settings.notificationPreferences,
        apiKey: settings.notificationPreferences.apiKey ?? existingApiKey,
      },
    };

    const res = await fetch('/api/company', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) {
      setCompany(data);
      showToast('Saved', 'Company settings updated successfully.', 'success');
    } else {
      setAppError(data.error || 'Unable to update company settings.');
      showToast('Save failed', data.error || 'Unable to update company settings.', 'error');
    }
    setSavingSettings(false);
  };

  const handleAddTechnician = async (name: string, email: string) => {
    if (isPreviewMode) {
      setTechnicians((prev) => [...prev, { id: `preview-${Date.now()}`, name, email }]);
      showToast('Preview mode', 'Technician added locally in preview mode.', 'success');
      return;
    }
    setAppError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    const token = session.access_token;

    const res = await fetch('/api/technicians', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, email }),
    });
    if (res.ok) {
      const newTech = await res.json();
      setTechnicians([...technicians, newTech]);
      showToast('Technician added', `${newTech.name} was added.`, 'success');
    } else {
      const err = await res.json();
      setAppError(err.error || 'Unable to add technician');
      showToast('Add failed', err.error || 'Unable to add technician', 'error');
    }
  };

  const handleRemoveTechnician = async (technicianId: string) => {
    if (isPreviewMode) {
      setTechnicians((prev) => prev.filter((t) => t.id !== technicianId));
      showToast('Preview mode', 'Technician removed locally in preview mode.', 'success');
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    const token = session.access_token;
    const res = await fetch(`/api/technicians?id=${technicianId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setTechnicians(technicians.filter(t => t.id !== technicianId));
      showToast('Technician removed', 'The technician was removed.', 'success');
    }
  };

  if (!user) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-offwhite page-fade-in">
      <div className="flex lg:pl-0">
        <Sidebar 
          activeTab={currentTab as string} 
          onTabChange={(tab: string) => setActiveTab(tab as Tab)} 
          onSignOut={handleSignOut}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {company ? (
            <>
              <div className="mb-6 rounded-2xl border border-zinc-200 bg-white px-6 py-5 shadow-sm">
                <h1 className="text-4xl font-bold text-navy">
                  {currentTab === 'technicians' ? 'Technician Management' : currentTab === 'logbook' ? 'Treatment Logbook' : 'Settings'}
                </h1>
                <p className="mt-1 text-zinc-600">
                  {currentTab === 'technicians'
                    ? 'Manage your team and track certification status'
                    : currentTab === 'logbook'
                    ? 'Record pest control treatments and maintain compliance records'
                    : 'Manage account and billing preferences'}
                </p>
              </div>
              {trialBanner ? (
                <Card className="mb-6 border-blue-200 bg-blue-50">
                  <div className="flex flex-col gap-4 p-4 text-blue-900 sm:flex-row sm:items-center sm:justify-between">
                    <div>Your current access ends on {trialBanner}. Upgrade now to retain full Pest Trace access.</div>
                    <Button variant="primary" onClick={() => router.push('/upgrade')}>
                      Upgrade now
                    </Button>
                  </div>
                </Card>
              ) : null}
              {appError && (
                <Card className="mb-6 border-red-200 bg-red-50">
                  <div className="text-red-800 p-4">{appError}</div>
                </Card>
              )}
              {currentTab === 'technicians' && (
              <>
                <TechniciansTab 
                  technicians={technicians} 
                  onAddTechnician={handleAddTechnician} 
                  onRemoveTechnician={(id) => setConfirmRemoveId(id)} 
                  isPro={isPro}
                  setSelectedTechId={setSelectedTechId}
                  setShowCertModal={setShowCertModal}
                  onLoadTechCerts={loadTechCerts}
                />
                <DashboardEnhancements plan={company.plan} />
              </>
              )}
              {currentTab === 'logbook' && (
                <LogbookTab companyId={company.id} technicians={technicians} />
              )}
              {currentTab === 'settings' && (
                <SettingsTab 
                  key={`${company.id}-${company.subscriptionStatus}-${company.plan ?? 'none'}`}
                  company={company} 
                  subscription={subscription} 
                  onSubscribe={() => setShowPlanModal(true)}
                  onManageSubscription={handleManageSubscription} 
                  onUpdateCompanySettings={handleUpdateCompanySettings}
                  onGenerateApiKey={handleGenerateApiKey}
                  onDeleteAccount={handleRequestDeleteAccount}
                  deletingAccount={deletingAccount}
                  savingSettings={savingSettings}
                  checkoutLoading={loadingCheckout} 
                  portalLoading={loadingPortal} 
                />
              )}
            </>
          ) : (
            <CompanySetupTab />
          )}
        </main>
      </div>
      <ConfirmDialog
        open={Boolean(confirmRemoveId)}
        title="Remove technician?"
        description="This action cannot be easily undone."
        confirmLabel="Remove"
        onCancel={() => setConfirmRemoveId(null)}
        onConfirm={() => {
          if (confirmRemoveId) {
            handleRemoveTechnician(confirmRemoveId);
            setConfirmRemoveId(null);
          }
        }}
      />

      <ConfirmDialog
        open={showDeleteAccountConfirm}
        title="Delete account"
        description="This will cancel your subscription and permanently delete your account and all company data. If you want to use Pest Trace again, you will need to sign up again. This cannot be undone."
        confirmLabel={deletingAccount ? 'Deleting...' : 'Delete account'}
        cancelLabel="Cancel"
        onCancel={() => setShowDeleteAccountConfirm(false)}
        onConfirm={handleDeleteAccount}
      />

      {/* Plan Modal */}
      {showPlanModal && (
        <PlanModal
          onClose={() => setShowPlanModal(false)}
          onSubscribe={handleSubscribe}
        />
      )}
      {/* Certification Modal */}
      {showCertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-navy">Upload Certification</h2>
              <Button size="sm" variant="secondary" onClick={() => setShowCertModal(false)}>✕</Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="form-label block mb-2">Technician</label>
                <p className="text-lg font-semibold">{technicians.find(t => t.id === selectedTechId)?.name}</p>
              </div>
              <div className="form-group">
                <label htmlFor="cert-file" className="form-label">Certification File (PDF/Image)</label>
                <input
                  id="cert-file"
                  type="file"
                  accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => {
                    const files = (e.target as HTMLInputElement).files;
                    if (files && files[0]) {
                      const originalFile = files[0];
                      const contentType = originalFile.type;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const base64 = reader.result as string;
                        setCertFile({ file: originalFile, dataUrl: base64, contentType });
                      };
                      reader.readAsDataURL(originalFile);
                    } else {
                      setCertFile(null);
                    }
                  }}
                  className="form-input"
                />
              </div>
              {certFile ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-800">Ready to upload</p>
                  <p className="text-sm text-slate-600">{certFile.file.name}</p>
                  {certFile.contentType.startsWith('image/') ? (
                    <Image
                      src={certFile.dataUrl}
                      alt="Certification preview"
                      width={400}
                      height={220}
                      className="mt-3 w-full max-w-xl rounded-2xl border border-slate-200 object-contain"
                      unoptimized
                    />
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      Document selected; it will be available for download after upload.
                    </p>
                  )}
                </div>
              ) : null}
              <FormInput
                label="Expiry Date (optional)"
                id="cert-expiry"
                type="date"
                value={certExpiry}
                onChange={(e) => setCertExpiry(e.target.value)}
              />
              <Button 
                onClick={handleCertUpload} 
                disabled={!certFile || certLoading || !isPro}
                className="w-full"
                size="lg"
              >
                {certLoading ? 'Uploading...' : 'Upload Certification'}
              </Button>
            </div>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-navy mb-3">Existing Certifications ({technicianCerts.length})</h3>
              {technicianCerts.length === 0 ? (
                <p className="text-gray-500 text-sm">No certifications uploaded yet.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {technicianCerts.map((cert) => {
                    const isExpired = cert.expiryDate && new Date(cert.expiryDate) < new Date();
                    return (
                      <div key={cert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{new Date(cert.uploadedAt).toLocaleDateString()}</p>
                          <p className={`text-sm ${isExpired ? 'text-red-600 font-semibold' : 'text-green-600'}`}>
                            {cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : 'No expiry'}
                          </p>
                        </div>
                        <a
                          href={`/api/storage/download?path=${encodeURIComponent(cert.fileUrl)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm bg-blue-600 text-white hover:bg-blue-700"
                        >
                          📥 Download
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== Sub-Components ==========
function CompanySetupTab() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showToast('Authentication required', 'You must be logged in', 'error');
      setLoading(false);
      return;
    }
    const token = session.access_token;

    const res = await fetch('/api/company', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      const err = await res.json().catch(() => ({ error: 'Error creating company' }));
      showToast('Setup failed', err.error || 'Error creating company', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <h2 className="text-2xl font-bold text-navy mb-4 text-center">Welcome to Pest Trace!</h2>
        <p className="text-zinc-600 mb-6 text-center">Let&apos;s set up your pest control company to get started.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            label="Company Name"
            id="company-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter company name"
            required
          />
          <Button type="submit" disabled={loading} size="lg">
            {loading ? 'Creating...' : 'Create Company'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

interface Certification {
  id: string;
  fileUrl: string;
  signedUrl?: string;
  expiryDate?: string;
  uploadedAt: string;
}

function TechniciansTab({ technicians, onAddTechnician, onRemoveTechnician, isPro, setSelectedTechId, setShowCertModal, onLoadTechCerts }: {
  technicians: Technician[];
  onAddTechnician: (name: string, email: string) => Promise<void>;
  onRemoveTechnician: (id: string) => void;
  isPro: boolean;
  setSelectedTechId: (id: string) => void;
  setShowCertModal: (open: boolean) => void;
  onLoadTechCerts: (techId: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onAddTechnician(name, email);
    setName('');
    setEmail('');
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h2 className="text-3xl font-bold text-navy">Add New Technician</h2>
        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <FormInput label="Full Name" id="tech-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" required />
          </div>
          <div className="sm:col-span-5">
            <FormInput label="Email Address" id="tech-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" required />
          </div>
          <div className="sm:col-span-2 flex items-end">
            <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Technician'}</Button>
          </div>
        </form>
      </Card>

      {technicians.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-zinc-600 text-lg">No technicians yet. Add your first technician above.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {technicians.map((tech) => (
            <Card key={tech.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-navy">{tech.name}</h3>
                <p className="text-zinc-600">{tech.email}</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={async () => {
                    await onLoadTechCerts(tech.id);
                    setSelectedTechId(tech.id);
                    setShowCertModal(true);
                  }}
                  disabled={!isPro}
                >
                  {isPro ? 'Manage Certification' : 'Pro Required'}
                </Button>
                <Button variant="danger" size="sm" onClick={() => onRemoveTechnician(tech.id)}>Remove</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function LogbookTab({ companyId, technicians }: { companyId: string; technicians: Technician[] }) {
  return <LogbookEntries companyId={companyId} technicians={technicians} />;
}

function LogbookEntries({ companyId, technicians }: { companyId: string; technicians: Technician[] }) {
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<LogbookEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEntries = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/logbook-entries?companyId=${companyId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
        setFilteredEntries(data);
      }
      setLoading(false);
    };
    fetchEntries();
  }, [companyId]);

  useEffect(() => {
    const lowerSearch = search.toLowerCase();
    setFilteredEntries(entries.filter(entry => 
      entry.clientName.toLowerCase().includes(lowerSearch) || 
      entry.address.toLowerCase().includes(lowerSearch)
    ));
  }, [search, entries]);

  const fetchImageAsBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      const mime = response.headers.get('content-type') || 'image/jpeg';
      return `data:${mime};base64,${base64}`;
    } catch {
      return '';
    }
  };

  const exportToPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    doc.setFontSize(20);
    doc.text('Pest Trace Compliance Report', 105, 50, { align: 'center' });
    doc.setFontSize(12);
    doc.text(new Date().toLocaleDateString(), 105, 70, { align: 'center' });
    doc.text(`Company ID: ${companyId}`, 105, 85, { align: 'center' });
    doc.addPage();
    
    let y = 20;
    for (const [index, entry] of filteredEntries.entries()) {
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(14);
      doc.text(`${index + 1}. ${entry.clientName}`, 15, y);
      y += 5;
      doc.setFontSize(10);
      doc.text(`Address: ${entry.address}`, 15, y);
      y += 4;
      doc.text(`Date: ${new Date(entry.date).toLocaleDateString()}`, 15, y);
      y += 4;
      doc.text(`Treatment: ${entry.treatment}`, 15, y);
      if (entry.rooms) doc.text(`Rooms: ${entry.rooms.join(', ')}`, 15, y + 4);
      y += 4;
      if (entry.baitBoxesPlaced) doc.text(`Bait Boxes: ${entry.baitBoxesPlaced}`, 15, y);
      y += 4;
      if (entry.poisonUsed) doc.text(`Poison: ${entry.poisonUsed}`, 15, y);
      y += 4;
      if (entry.status) doc.text(`Status: ${entry.status}`, 15, y);
      y += 8;
      if (entry.notes) {
        const notesLines = doc.splitTextToSize(entry.notes, 170);
        doc.text(notesLines, 15, y);
        y += notesLines.length * 4 + 5;
      } else {
        y += 5;
      }

      const photoUrls = parsePhotoUrls(entry.photoUrl, entry.photoUrls, entry.photos);
      if (photoUrls.length > 0) {
        y += 5;
        doc.text('Photos:', 15, y);
        y += 8;
        for (const [photoIndex, photoUrl] of photoUrls.slice(0, 4).entries()) {
          if (y > 250) {
            doc.addPage();
            y = 20;
          }
          try {
            const base64 = await fetchImageAsBase64(photoUrl);
            if (base64) {
              doc.addImage(base64, 'JPEG', 15, y, 60, 45);
              doc.text(`Photo ${photoIndex + 1}`, 80, y + 10);
            }
          } catch {
            doc.text(`Photo ${photoIndex + 1} (unavailable)`, 15, y);
          }
          y += 50;
        }
        y += 5;
      }
    }
    
    doc.save(`pesttrace-compliance-${Date.now()}.pdf`);
  };

  if (loading) return <div>Loading entries...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy">Logbook Entries</h2>
          <p className="text-zinc-600">{filteredEntries.length} entries</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries..."
            className="form-input w-full sm:w-72 border-zinc-300 rounded-xl px-4 py-3"
          />
          <Button onClick={exportToPDF} variant="secondary" size="lg">📥 Export PDF</Button>
        </div>
      </div>
      <Card>
        <AddLogbookEntryForm
          companyId={companyId}
          technicians={technicians}
          onAdd={(entry) => {
            setEntries((prevEntries) => [entry, ...prevEntries]);
            setFilteredEntries((prevFiltered) => {
              if (!search.trim()) return [entry, ...prevFiltered];
              const lowerSearch = search.toLowerCase();
              return entry.clientName.toLowerCase().includes(lowerSearch) || entry.address.toLowerCase().includes(lowerSearch)
                ? [entry, ...prevFiltered]
                : prevFiltered;
            });
          }}
        />
      </Card>
      {entries.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-zinc-600 text-lg">No logbook entries yet.</p>
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-zinc-200">
            {entries.map((entry) => (
              <div key={entry.id} className="p-6 hover:bg-zinc-50">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-navy">{entry.clientName}</h3>
                    <p className="text-zinc-600 mt-1">{entry.address}</p>
                    <p className="text-sm text-zinc-500 mt-1">{new Date(entry.date).toLocaleDateString()}</p>
                  </div>
                  <span className="inline-flex px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">
                    {entry.treatment}
                  </span>
                </div>
                {renderRoomDetails(entry.rooms)}
                {entry.notes && <p className="mt-3 text-zinc-700">{entry.notes}</p>}
                {parsePhotoUrls(entry.photoUrl, entry.photoUrls, entry.photos).length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {parsePhotoUrls(entry.photoUrl, entry.photoUrls, entry.photos).map((url) => (
<Image
                        key={url}
                        loader={supabaseImageLoader}
                        src={url}
                        alt="Job photo"
                        width={600}
                        height={300}
                        className="w-full h-auto max-h-[400px] object-contain rounded-2xl border shadow-sm hover:shadow-md transition-shadow"
                        unoptimized
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function AddLogbookEntryForm({ companyId, technicians, onAdd }: {
  companyId: string;
  technicians: Technician[];
  onAdd: (entry: LogbookEntry) => void;
}) {
  const [date, setDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [productAmount, setProductAmount] = useState('');
  const [recommendation, setRecommendation] = useState('');
  interface RoomForm {
    name: string;
    note: string;
  }
  const [rooms, setRooms] = useState<RoomForm[]>([]);
  const [baitBoxesPlaced, setBaitBoxesPlaced] = useState('');
  const [poisonUsed, setPoisonUsed] = useState('');
  const [baitStations, setBaitStations] = useState<BaitStationForm[]>([]);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const isDrawing = useRef(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const getCanvasPoint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl('');
  };

  const beginSignature = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawing.current = true;
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const continueSignature = (x: number, y: number) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const finishSignature = (pointerId?: number) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (pointerId != null && canvas.hasPointerCapture && canvas.releasePointerCapture) {
      if (canvas.hasPointerCapture(pointerId)) {
        canvas.releasePointerCapture(pointerId);
      }
    }
    setSignatureDataUrl(canvas.toDataURL('image/png'));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasPoint(event.clientX, event.clientY);
    if (!coords) return;
    beginSignature(coords.x, coords.y);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasPoint(event.clientX, event.clientY);
    if (!coords) return;
    continueSignature(coords.x, coords.y);
    event.preventDefault();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    finishSignature(event.pointerId);
    event.preventDefault();
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    finishSignature(event.pointerId);
    event.preventDefault();
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    const coords = getCanvasPoint(touch.clientX, touch.clientY);
    if (!coords) return;
    beginSignature(coords.x, coords.y);
    event.preventDefault();
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    const coords = getCanvasPoint(touch.clientX, touch.clientY);
    if (!coords) return;
    continueSignature(coords.x, coords.y);
    event.preventDefault();
  };

  const handleTouchEnd = () => {
    finishSignature();
  };

  const addBaitStation = () => {
    setBaitStations([...baitStations, { stationId: '', location: '', baitType: '', amount: '' }]);
  };

  const updateBaitStation = (index: number, field: keyof BaitStationForm, value: string) => {
    const newStations = [...baitStations];
    newStations[index] = { ...newStations[index], [field]: value } as BaitStationForm;
    setBaitStations(newStations);
  };

  const removeBaitStation = (index: number) => {
    setBaitStations(baitStations.filter((_, i) => i !== index));
  };

  const addRoom = () => {
    setRooms([...rooms, { name: '', note: '' }]);
  };

  const updateRoom = (index: number, field: keyof RoomForm, value: string) => {
    const newRooms = [...rooms];
    newRooms[index] = { ...newRooms[index], [field]: value } as RoomForm;
    setRooms(newRooms);
  };

  const removeRoom = (index: number) => {
    setRooms(rooms.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !date || !clientName || !address || !treatment || !technicianId) {
      showToast('Missing fields', 'Please fill all required fields', 'error');
      return;
    }
    
    const validBaitStations = baitStations.filter(station => 
      station.stationId.trim() && station.location.trim()
    );

    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    const photoFiles = photoInputRef.current?.files
      ? Array.from(photoInputRef.current.files).slice(0, 4)
      : [];
    const uploadedPhotoPaths: string[] = [];

    if (photoFiles.length > 0) {
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i]!;
        const safeName = file.name.replace(/[^\w.\-]+/g, '_') || 'photo.jpg';
        const filePath = `private/${companyId}/${technicianId}/${Date.now()}-${i}-${safeName}`;
        const { error } = await supabase.storage
          .from('logbook-photos')
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (error) {
          showToast('Photo upload failed', error.message, 'error');
          setLoading(false);
          return;
        }
        uploadedPhotoPaths.push(filePath);
      }
    }
    
    const roomsPayload = rooms
      .map((room) => ({ name: room.name.trim(), note: room.note.trim() }))
      .filter((room) => room.name.length > 0);

    const payload = {
      companyId,
      date,
      clientName,
      address,
      treatment,
      notes: notes || undefined,
      technicianIds: [technicianId],
      rooms: roomsPayload.length > 0 ? roomsPayload : undefined,
      baitBoxesPlaced: baitBoxesPlaced || undefined,
      poisonUsed: poisonUsed || undefined,
      followUpDate: followUpDate || undefined,
      internalNotes: internalNotes || undefined,
      productAmount: productAmount || undefined,
      recommendation: recommendation || undefined,
      signature: signatureDataUrl || undefined,
      ...(uploadedPhotoPaths.length > 0 && {
        photoUrls: uploadedPhotoPaths,
        photoUrl: uploadedPhotoPaths[0],
      }),
      ...(validBaitStations.length > 0 && { baitStations: validBaitStations }),
    };
    
    const res = await fetch('/api/logbook-entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    
    if (res.ok) {
      const entry = await res.json();
      onAdd(entry);
      setDate('');
      setClientName('');
      setAddress('');
      setTreatment('');
      setNotes('');
      setTechnicianId('');
      setFollowUpDate('');
      setInternalNotes('');
      setProductAmount('');
      setRecommendation('');
      setRooms([]);
      setBaitBoxesPlaced('');
      setPoisonUsed('');
      setBaitStations([]);
      if (photoInputRef.current) photoInputRef.current.value = '';
      showToast('Entry saved', 'Logbook entry saved successfully!', 'success');
    } else {
      const error = await res.json();
      showToast('Save failed', error.error || 'Error adding entry', 'error');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormInput label="Date" id="entry-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      <FormInput label="Client Name" id="entry-client-name" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" required />
      <FormInput label="Address" id="entry-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Job address" required />
      <FormInput label="Treatment" id="entry-treatment" value={treatment} onChange={(e) => setTreatment(e.target.value)} placeholder="e.g. Rodent control" required />
              <div className="md:col-span-2 mb-6 p-4 bg-gray-50 rounded-xl">
                <label className="form-label block mb-3 font-semibold">Rooms</label>
                {rooms.length === 0 ? (
                  <Button type="button" variant="secondary" onClick={addRoom} size="sm">
                    + Add Room
                  </Button>
                ) : (
                  <div className="space-y-3">
                    {rooms.map((room, index) => (
                      <div key={index} className="space-y-3 p-4 bg-white rounded-lg border shadow-sm max-w-3xl">
                        <FormInput 
                          label="Room Name" 
                          id={`room-${index}`}
                          value={room.name} 
                          onChange={(e) => updateRoom(index, 'name', e.target.value)} 
                          placeholder="Kitchen" 
                        />
                        <FormInput
                          label="Room Notes"
                          id={`room-note-${index}`}
                          as="textarea"
                          value={room.note}
                          onChange={(e) => updateRoom(index, 'note', e.target.value)}
                          placeholder="Notes about treatment or observations in this room"
                        />
                        <Button type="button" variant="danger" size="sm" onClick={() => removeRoom(index)} className="self-start">Remove</Button>
                      </div>
                    ))}
                    <Button type="button" variant="secondary" onClick={addRoom} size="sm">+ Add Another Room</Button>
                  </div>
                )}
              </div>
      <FormInput label="Bait Boxes Placed" id="entry-bait-boxes" value={baitBoxesPlaced} onChange={(e) => setBaitBoxesPlaced(e.target.value)} placeholder="Yes, 6 boxes" />
      <FormInput label="Poison Used" id="entry-poison-used" value={poisonUsed} onChange={(e) => setPoisonUsed(e.target.value)} placeholder="e.g. Bromadiolone" />
      <FormInput
        label="Technician"
        id="entry-technician"
        as="select"
        value={technicianId || ''}
        onChange={(e) => setTechnicianId(e.target.value)}
        required
        options={[{ value: '', label: 'Select technician' }, ...technicians.map((tech) => ({ value: tech.id, label: tech.name }))]}
      />
      <div className="md:col-span-2">
        <FormInput label="Notes" id="entry-notes" as="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Treatment substances, observations..." />
      </div>
      <FormInput label="Follow-up Date" id="follow-up-date" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
      <div className="md:col-span-2">
        <FormInput label="Internal Notes" id="internal-notes" as="textarea" value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder="Internal use only..." />
      </div>
      <FormInput label="Product Amount" id="product-amount" value={productAmount} onChange={(e) => setProductAmount(e.target.value)} placeholder="e.g. 2kg" />
      <div className="md:col-span-2 mb-6 p-4 bg-gray-50 rounded-xl">
        <label className="form-label block mb-3 font-semibold">Bait Stations</label>
        {baitStations.length === 0 ? (
          <Button type="button" variant="secondary" onClick={addBaitStation} size="sm">
            + Add Bait Station
          </Button>
        ) : (
          <div className="space-y-3">
            {baitStations.map((station, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-white rounded-lg border shadow-sm">
                <FormInput label="Station ID" id={`station-id-${index}`} value={station.stationId} onChange={(e) => updateBaitStation(index, 'stationId', e.target.value)} placeholder="BS001" />
                <FormInput label="Location" id={`station-location-${index}`} value={station.location} onChange={(e) => updateBaitStation(index, 'location', e.target.value)} placeholder="Kitchen" />
                <FormInput label="Bait Type" id={`station-bait-type-${index}`} value={station.baitType || ''} onChange={(e) => updateBaitStation(index, 'baitType', e.target.value)} placeholder="Wax block" />
                <FormInput label="Amount" id={`station-amount-${index}`} value={station.amount || ''} onChange={(e) => updateBaitStation(index, 'amount', e.target.value)} placeholder="50g" />
                <Button type="button" variant="danger" size="sm" onClick={() => removeBaitStation(index)} className="self-start">Remove</Button>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={addBaitStation} size="sm">+ Add Another Bait Station</Button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="form-group">
          <label htmlFor="logbook-photos" className="form-label">Photos (optional, up to 4)</label>
          <input
            ref={photoInputRef}
            id="logbook-photos"
            type="file"
            multiple
            accept="image/*"
            className="form-input"
          />
        </div>
        <div className="form-group">
          <div className="flex items-center justify-between">
            <label className="form-label mb-0">E-Signature</label>
            {signatureDataUrl && (
              <button type="button" onClick={clearSignature} className="text-sm text-red-600 hover:text-red-800 font-medium">Clear Signature</button>
            )}
          </div>
          <div className="rounded-lg border-2 border-gray-300 overflow-hidden bg-white shadow-sm">
            <canvas
              ref={canvasRef}
              width={800}
              height={200}
              className="signature-canvas w-full touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerCancel}
              onPointerCancel={handlePointerCancel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Draw signature (optional)</p>
          {signatureDataUrl && (
            <Image src={signatureDataUrl} alt="Signature preview" width={600} height={240} className="mt-3 h-24 w-full max-w-xs rounded-2xl border border-gray-200 object-contain" unoptimized />
          )}
        </div>
      </div>
      <div className="md:col-span-2 pt-2">
        <Button type="submit" size="lg" disabled={loading}>{loading ? 'Saving entry...' : 'Save Logbook Entry'}</Button>
      </div>
    </form>
  );
}

