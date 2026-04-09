import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import Sidebar from '../components/sidebar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';
import { useToast } from '../components/ui/ToastProvider';
import ConfirmDialog from '../components/ui/ConfirmDialog';

interface User {
  id: string;
  email?: string;
}

interface Company {
  id: string;
  name?: string;
  email: string;
  subscriptionStatus: string;
  trialEndsAt?: string | null;
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

type Tab = 'technicians' | 'logbook' | 'settings';

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [activeTab, setActiveTab] = useState<'technicians' | 'logbook' | 'settings'>('technicians');
  const [loadingCheckout, setLoadingCheckout] = useState(false);
const [loadingPortal, setLoadingPortal] = useState(false);

  const [appError, setAppError] = useState<string | null>(null);
  const [trialBanner, setTrialBanner] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const router = useRouter();
  const { showToast } = useToast();
  const isPreviewMode = process.env.NODE_ENV === 'development' && router.query.preview === '1';

  useEffect(() => {
    const getUser = async () => {
      if (isPreviewMode) {
        setUser({ id: 'preview-user', email: 'preview@pestlog.local' });
        setCompany({
          id: 'preview-company',
          name: 'PestTrek Preview Co.',
          email: 'owner@preview.local',
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
        setCompany(null);
        setTechnicians([]);
        setAppError(companyData?.error || 'Unable to load company details.');
        showToast('Load failed', companyData?.error || 'Unable to load company details.', 'error');
        return;
      }

      setCompany(companyData);
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
          const trialExpired = !subData.trialEndsAt || new Date(subData.trialEndsAt).getTime() < now;
          if (subData.status !== 'active' && trialExpired) {
            router.push('/upgrade');
            return;
          }
          if (subData.status !== 'active' && subData.trialEndsAt && new Date(subData.trialEndsAt).getTime() > now) {
            setTrialBanner(new Date(subData.trialEndsAt).toLocaleDateString());
          } else {
            setTrialBanner(null);
          }
        }
      }
    };
    getUser();
  }, [isPreviewMode, router, showToast]);

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

  const handleSubscribe = async () => {
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
      body: JSON.stringify({ plan: 'pro' }),
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
                  <div className="p-4 text-blue-900">
                    Your 14-day free trial ends on {trialBanner}. Upgrade to keep using PestTrek.
                  </div>
                </Card>
              ) : null}
              {appError && (
                <Card className="mb-6 border-red-200 bg-red-50">
                  <div className="text-red-800 p-4">
                    {appError}
                  </div>
                </Card>
              )}
              {currentTab === 'technicians' && (
                <TechniciansTab 
                  technicians={technicians} 
                  onAddTechnician={handleAddTechnician} 
                  onRemoveTechnician={(id) => setConfirmRemoveId(id)} 
                />
              )}
              {currentTab === 'logbook' && (
                <LogbookTab companyId={company.id} technicians={technicians} />
              )}
              {currentTab === 'settings' && (
                <SettingsTab 
                  company={company} 
                  subscription={subscription} 
                  onSubscribe={handleSubscribe} 
                  onManageSubscription={handleManageSubscription} 
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
    </div>
  );
}

// ========== Sub-Components ==========

function CompanySetupTab() {
  return (
    <div className="max-w-md mx-auto">
      <Card>
        <h2 className="text-2xl font-bold text-navy mb-4 text-center">Welcome to PestTrek!</h2>
        <p className="text-zinc-600 mb-6 text-center">Let&apos;s set up your pest control company to get started.</p>
        <CompanySetupForm />
      </Card>
    </div>
  );
}

function CompanySetupForm() {
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
  );
}

function TechniciansTab({ technicians, onAddTechnician, onRemoveTechnician }: {
  technicians: Technician[];
  onAddTechnician: (name: string, email: string) => Promise<void>;
  onRemoveTechnician: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [openCertModal, setOpenCertModal] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState('');

  const uploadCertification = (techId: string) => {
    setSelectedTechId(techId);
    setOpenCertModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onAddTechnician(name, email);
      setName('');
      setEmail('');
    } finally {
      setLoading(false);
    }
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
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Technician'}
            </Button>
          </div>
        </form>
      </Card>

      {!Array.isArray(technicians) || technicians.length === 0 ? (
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
                <Button variant="secondary" size="sm" onClick={() => uploadCertification(tech.id)}>Upload Certification</Button>
                <Button variant="danger" size="sm" onClick={() => onRemoveTechnician(tech.id)}>Remove</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <CertificationUploadModal openCertModal={openCertModal} setOpenCertModal={setOpenCertModal} selectedTechId={selectedTechId} />
    </div>
  );
}

interface CertificationUploadModalProps {
  openCertModal: boolean;
  setOpenCertModal: (open: boolean) => void;
  selectedTechId: string;
}

function CertificationUploadModal({ openCertModal, setOpenCertModal, selectedTechId }: CertificationUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const { showToast } = useToast();

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !selectedTechId) {
      showToast('Validation failed', 'Please select a file and technician.', 'error');
      return;
    }
    setUploading(true);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/technicians/certifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          technicianId: selectedTechId,
          expiryDate: expiryDate || null,
          file: base64,
        }),
      });
      if (res.ok) {
        showToast('Success', 'Certification uploaded successfully.', 'success');
        setOpenCertModal(false);
        setFile(null);
        setExpiryDate('');
      } else {
        const err = await res.json();
        showToast('Upload failed', err.error || 'Failed to upload certification', 'error');
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      {openCertModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-navy">Upload Certification</h3>
              <Button variant="secondary" size="sm" onClick={() => setOpenCertModal(false)}>
                ✕
              </Button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
<input
                type="file"
                id="cert-file"
                accept="image/*,.pdf"
                aria-label="Select certification file (PDF or image)"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="file-input file-input-bordered w-full"
                required
              />
              <FormInput
                id="cert-expiry"
                label="Expiry Date (optional)"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={uploading || !file} className="flex-1">
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
                <Button type="button" onClick={() => setOpenCertModal(false)} disabled={uploading} variant="secondary">
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function LogbookTab({ companyId, technicians }: { companyId: string; technicians: Technician[] }) {
  return <LogbookEntries companyId={companyId} technicians={technicians} />;
}

function LogbookEntries({ companyId, technicians }: { companyId: string; technicians: Technician[] }) {
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
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
      }
      setLoading(false);
    };
    fetchEntries();
  }, [companyId]);

  const exportToPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.text(`${companyId} Pest Control Log`, 10, 10);
    entries.forEach((entry, index) => {
      doc.text(`${entry.date}: ${entry.clientName} (${entry.address}) - ${entry.treatment}`, 10, 20 + index * 10);
    });
    doc.save(`pesttrek-logbook-${Date.now()}.pdf`);
  };

  if (loading) return <div className="flex items-center justify-center min-h-64">Loading entries...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-navy">Logbook Entries</h2>
        <Button onClick={exportToPDF} variant="secondary">
          📥 Export PDF
        </Button>
      </div>
      <Card>
        <AddLogbookEntryForm companyId={companyId} technicians={technicians} onAdd={(entry) => setEntries([entry, ...entries])} />
      </Card>
      {entries.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-zinc-600 text-lg">No logbook entries yet.</p>
          <p className="text-zinc-500 mt-2">Create your first entry above.</p>
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-zinc-200">
            {entries.map((entry) => (
              <div key={entry.id} className="p-6 hover:bg-zinc-50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-navy">{entry.clientName}</h3>
                    <p className="text-zinc-600 mt-1">{entry.address}</p>
                    <p className="text-sm text-zinc-500 mt-1">{new Date(entry.date).toLocaleDateString()}</p>
                  </div>
                  <span className="inline-flex px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium whitespace-nowrap">
                    {entry.treatment}
                  </span>
                </div>
                {entry.notes && (
                  <p className="mt-3 text-zinc-700">{entry.notes}</p>
                )}
                {parsePhotoUrls(entry.photoUrl, entry.photoUrls, entry.photos).length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {parsePhotoUrls(entry.photoUrl, entry.photoUrls, entry.photos).map((url) => (
                      <Image
                        key={url}
                        src={url}
                        alt="Job photo"
                        width={600}
                        height={300}
                        className="h-40 w-full rounded-2xl border object-cover"
                        unoptimized
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function AddLogbookEntryForm({ companyId, technicians, onAdd }: { companyId: string; technicians: Technician[]; onAdd: (entry: LogbookEntry) => void }) {
  const [date, setDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handlePhotoChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selectedFiles = Array.from(files).slice(0, 4);
    if (selectedFiles.length > 4) {
      showToast('Upload limit', 'You can upload up to 4 photos per entry.', 'info');
    }
    setPhotoUploading(true);
    const uploadedUrls: string[] = [];
    const previewUrls: string[] = [];
    for (const file of selectedFiles) {
      const filePath = `private/${companyId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('logbook-photos')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (error) {
        showToast('Upload failed', error.message, 'error');
        setPhotoUploading(false);
        return;
      }

      uploadedUrls.push(filePath);
      previewUrls.push(URL.createObjectURL(file));
    }
    setPhotoUrls(uploadedUrls);
    setPhotoPreviewUrls(previewUrls);
    showToast('Upload complete', `${uploadedUrls.length} photo(s) attached to this entry.`, 'success');
    setPhotoUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photoUploading) {
      showToast('Please wait', 'Image upload is still in progress.', 'info');
      return;
    }
    const effectiveTechnicianId = technicianId || technicians[0]?.id || '';
    if (!effectiveTechnicianId) {
      showToast('Save failed', 'Please add a technician before creating logbook entries.', 'error');
      return;
    }
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/logbook-entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({
        companyId,
        date,
        clientName,
        address,
        treatment,
        notes,
        technicianId: effectiveTechnicianId,
        photoUrl: photoUrls[0] || null,
        photoUrls,
      }),
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
      setPhotoUrls([]);
      setPhotoPreviewUrls([]);
      const fileInput = document.getElementById('entry-photo') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      showToast('Entry saved', 'Logbook entry saved successfully.', 'success');
    } else {
      const err = await res.json().catch(() => ({ error: 'Error adding entry' }));
      const message = err.details ? `${err.error || 'Error adding entry'}: ${err.details}` : (err.error || 'Error adding entry');
      console.error('Logbook save failed', err);
      showToast('Save failed', message, 'error');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormInput
        label="Date"
        id="entry-date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />
      <FormInput
        label="Client Name"
        id="entry-client-name"
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
        placeholder="Client name"
        required
      />
      <FormInput
        label="Address"
        id="entry-address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Job address"
        required
      />
      <FormInput
        label="Treatment"
        id="entry-treatment"
        value={treatment}
        onChange={(e) => setTreatment(e.target.value)}
        placeholder="e.g. Rodent control"
        required
      />
      <FormInput
        label="Technician"
        id="entry-technician"
        as="select"
        value={technicianId || technicians[0]?.id || ''}
        onChange={(e) => setTechnicianId(e.target.value)}
        required
        options={technicians.map((tech) => ({ value: tech.id, label: tech.name }))}
      />
      <div className="md:col-span-2">
        <FormInput
          label="Notes"
          id="entry-notes"
          as="textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Treatment substances, observations, compliance notes..."
        />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="entry-photo" className="mb-2 block text-sm font-medium text-zinc-700">
          Job Photos (optional, up to 4)
        </label>
        <input
          id="entry-photo"
          type="file"
          multiple
          accept="image/*"
          className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          onChange={(e) => {
            void handlePhotoChange(e.target.files);
          }}
        />
        {photoUploading ? <p className="mt-2 text-sm text-zinc-500">Uploading photo...</p> : null}
        {!photoUploading && photoPreviewUrls.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {photoPreviewUrls.map((url) => (
              <Image key={url} src={url} alt="Uploaded job photo preview" width={600} height={300} className="h-32 w-full rounded-xl border object-cover" unoptimized />
            ))}
          </div>
        ) : null}
      </div>
      <div className="md:col-span-2 pt-2">
        <Button type="submit" size="lg" disabled={loading || photoUploading}>
          {loading ? (
            <>
              <span className="spinner"></span>
              Saving entry...
            </>
          ) : (
            'Save Logbook Entry'
          )}
        </Button>
      </div>
    </form>
  );
}

function SettingsTab({ company, subscription, onSubscribe, onManageSubscription, checkoutLoading, portalLoading }: {
  company: Company;
  subscription: Subscription | null;
  onSubscribe: () => void;
  onManageSubscription: () => void;
  checkoutLoading: boolean;
  portalLoading: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const loadSavedSettings = () => {
    if (typeof window === 'undefined') {
      return {
        companyName: company.name || '',
        billingEmail: company.email || '',
        phone: '',
        retentionDays: '365',
        certReminderDays: '30',
        emailAlerts: true,
        weeklySummary: true,
        mfaRequired: false,
      };
    }
    const saved = localStorage.getItem(`settings-${company.id}`);
    if (!saved) {
      return {
        companyName: company.name || '',
        billingEmail: company.email || '',
        phone: '',
        retentionDays: '365',
        certReminderDays: '30',
        emailAlerts: true,
        weeklySummary: true,
        mfaRequired: false,
      };
    }
    try {
      const parsed = JSON.parse(saved) as {
        companyName?: string;
        billingEmail?: string;
        phone?: string;
        retentionDays?: string;
        certReminderDays?: string;
        emailAlerts?: boolean;
        weeklySummary?: boolean;
        mfaRequired?: boolean;
      };
      return {
        companyName: parsed.companyName ?? company.name ?? '',
        billingEmail: parsed.billingEmail ?? company.email,
        phone: parsed.phone ?? '',
        retentionDays: parsed.retentionDays ?? '365',
        certReminderDays: parsed.certReminderDays ?? '30',
        emailAlerts: parsed.emailAlerts ?? true,
        weeklySummary: parsed.weeklySummary ?? true,
        mfaRequired: parsed.mfaRequired ?? false,
      };
    } catch {
      return {
        companyName: company.name || '',
        billingEmail: company.email || '',
        phone: '',
        retentionDays: '365',
        certReminderDays: '30',
        emailAlerts: true,
        weeklySummary: true,
        mfaRequired: false,
      };
    }
  };

  const initialSettings = loadSavedSettings();
  const [companyName, setCompanyName] = useState(initialSettings.companyName);
  const [billingEmail, setBillingEmail] = useState(initialSettings.billingEmail);
  const [phone, setPhone] = useState(initialSettings.phone);
  const [retentionDays, setRetentionDays] = useState(initialSettings.retentionDays);
  const [certReminderDays, setCertReminderDays] = useState(initialSettings.certReminderDays);
  const [emailAlerts, setEmailAlerts] = useState(initialSettings.emailAlerts);
  const [weeklySummary, setWeeklySummary] = useState(initialSettings.weeklySummary);
  const [mfaRequired, setMfaRequired] = useState(initialSettings.mfaRequired);
  const [complianceDeadlines, setComplianceDeadlines] = useState(initialSettings.emailAlerts ?? true);
  const [certExpiryAlerts, setCertExpiryAlerts] = useState(true);
  const [followUpReminders, setFollowUpReminders] = useState(true);
  const [missedLogbookAlerts, setMissedLogbookAlerts] = useState(true);
  const [billingEvents, setBillingEvents] = useState(false);
  const [digestMode, setDigestMode] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState('21:00');
  const [quietEnd, setQuietEnd] = useState('07:00');
  const [pushPermission, setPushPermission] = useState<'unsupported' | 'default' | 'denied' | 'granted'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCompliance, setSavingCompliance] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  const persistSettings = () => {
    localStorage.setItem(
      `settings-${company.id}`,
      JSON.stringify({
        companyName,
        billingEmail,
        phone,
        retentionDays,
        certReminderDays,
        emailAlerts,
        weeklySummary,
        mfaRequired,
        complianceDeadlines,
        certExpiryAlerts,
        followUpReminders,
        missedLogbookAlerts,
        billingEvents,
        digestMode,
        quietHoursEnabled,
        quietStart,
        quietEnd,
      })
    );
  };

  const requestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('Not supported', 'Push notifications are not supported on this device/browser.', 'info');
      return;
    }
    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    if (permission === 'granted') {
      showToast('Notifications enabled', 'Critical compliance alerts will be delivered when available.', 'success');
      return;
    }
    showToast('Notifications blocked', 'You can enable notifications later from browser settings.', 'info');
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    persistSettings();
    await new Promise((resolve) => setTimeout(resolve, 350));
    setSavingProfile(false);
    showToast('Profile saved', 'Company settings saved locally. Backend endpoint can be wired later.', 'success');
  };

  const handleSaveCompliance = async () => {
    setSavingCompliance(true);
    persistSettings();
    await new Promise((resolve) => setTimeout(resolve, 350));
    setSavingCompliance(false);
    showToast('Compliance saved', 'Compliance policy settings saved locally.', 'success');
  };

  const handleSaveNotifications = async () => {
    setSavingNotifications(true);
    persistSettings();
    await new Promise((resolve) => setTimeout(resolve, 350));
    setSavingNotifications(false);
    showToast('Notifications saved', 'Alert preferences saved locally.', 'success');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-bold text-navy">Settings</h2>

      <Card className="space-y-6 p-8">
        <h3 className="text-xl font-bold text-navy">Company & Billing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput label="Company Name" id="settings-company-name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
          <FormInput label="Billing Email" id="settings-billing-email" type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} />
          <FormInput label="Phone Number" id="settings-phone-number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 7..." />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSaveProfile} disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save Profile'}</Button>
          {subscription?.status === 'active' ? (
            <Button onClick={onManageSubscription} disabled={portalLoading}>
              {portalLoading ? 'Opening Portal...' : 'Manage Membership'}
            </Button>
          ) : (
                <Button onClick={onSubscribe} disabled={checkoutLoading} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
              {checkoutLoading ? 'Loading...' : 'Choose Plan & Upgrade'}
            </Button>
          )}
        </div>
        {/* PlanSelectorModal - Add below after imports & before SettingsTab */}


      </Card>

      <Card className="space-y-6 p-8">
        <h3 className="text-xl font-bold text-navy">Compliance & Data Policy</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Data Retention (days)"
            id="settings-retention-days"
            type="number"
            value={retentionDays}
            onChange={(e) => setRetentionDays(e.target.value)}
          />
          <FormInput
            label="Certification Reminder (days before expiry)"
            id="settings-cert-reminder-days"
            type="number"
            value={certReminderDays}
            onChange={(e) => setCertReminderDays(e.target.value)}
          />
        </div>
        <Button onClick={handleSaveCompliance} disabled={savingCompliance}>
          {savingCompliance ? 'Saving...' : 'Save Compliance Policy'}
        </Button>
      </Card>

      <Card className="space-y-6 p-8">
        <h3 className="text-xl font-bold text-navy">Security & Notifications</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
            <span className="text-sm font-medium text-navy">Require MFA for all admins</span>
            <input type="checkbox" checked={mfaRequired} onChange={(e) => setMfaRequired(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
            <span className="text-sm font-medium text-navy">Email alerts for failed compliance checks</span>
            <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
            <span className="text-sm font-medium text-navy">Weekly owner summary report</span>
            <input type="checkbox" checked={weeklySummary} onChange={(e) => setWeeklySummary(e.target.checked)} />
          </label>
        </div>
        <div className="rounded-xl border border-zinc-200 p-4">
          <p className="text-sm font-semibold text-navy">Push Notification Status</p>
          <p className="mt-1 text-xs text-zinc-600">
            {pushPermission === 'granted'
              ? 'Allowed on this device.'
              : pushPermission === 'denied'
              ? 'Blocked in browser settings.'
              : pushPermission === 'unsupported'
              ? 'Not supported on this device/browser.'
              : 'Not requested yet.'}
          </p>
          <Button className="mt-3" variant="secondary" onClick={requestPushPermission} disabled={pushPermission === 'unsupported'}>
            Enable Device Notifications
          </Button>
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold text-navy">Alert Categories</p>
          <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
            <span className="text-sm font-medium text-navy">Compliance/report deadlines</span>
            <input type="checkbox" checked={complianceDeadlines} onChange={(e) => setComplianceDeadlines(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
            <span className="text-sm font-medium text-navy">Technician certification expiry reminders</span>
            <input type="checkbox" checked={certExpiryAlerts} onChange={(e) => setCertExpiryAlerts(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
            <span className="text-sm font-medium text-navy">Follow-up treatment reminders</span>
            <input type="checkbox" checked={followUpReminders} onChange={(e) => setFollowUpReminders(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
            <span className="text-sm font-medium text-navy">Missed or overdue logbook entries</span>
            <input type="checkbox" checked={missedLogbookAlerts} onChange={(e) => setMissedLogbookAlerts(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
            <span className="text-sm font-medium text-navy">Subscription and billing status events</span>
            <input type="checkbox" checked={billingEvents} onChange={(e) => setBillingEvents(e.target.checked)} />
          </label>
        </div>
        <div className="space-y-3 rounded-xl border border-zinc-200 p-4">
          <p className="text-sm font-semibold text-navy">Noise Control</p>
          <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
            <span className="text-sm font-medium text-navy">Digest mode for non-urgent updates</span>
            <input type="checkbox" checked={digestMode} onChange={(e) => setDigestMode(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
            <span className="text-sm font-medium text-navy">Quiet hours</span>
            <input type="checkbox" checked={quietHoursEnabled} onChange={(e) => setQuietHoursEnabled(e.target.checked)} />
          </label>
          {quietHoursEnabled ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <FormInput label="Quiet hours start" id="settings-quiet-start" type="time" value={quietStart} onChange={(e) => setQuietStart(e.target.value)} />
              <FormInput label="Quiet hours end" id="settings-quiet-end" type="time" value={quietEnd} onChange={(e) => setQuietEnd(e.target.value)} />
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSaveNotifications} disabled={savingNotifications}>
            {savingNotifications ? 'Saving...' : 'Save Security & Notifications'}
          </Button>
          <Button onClick={() => router.push('/reports')} variant="secondary">
            View Reports
          </Button>
        </div>
      </Card>

      <p className="text-xs text-zinc-500">
        Note: this settings UI is launch-ready. Values persist locally now and can be connected to backend API endpoints without changing the interface.
      </p>
    </div>
  );
}
