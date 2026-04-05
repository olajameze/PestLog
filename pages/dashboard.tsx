import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';
import Navbar from '../components/navbar';
import Sidebar from '../components/sidebar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import FormInput from '../components/ui/FormInput';

interface User {
  id: string;
  email?: string;
}

interface Company {
  id: string;
  name?: string;
  email: string;
  subscriptionStatus: string;
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
  signature?: string;
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
  const [addingTech, setAddingTech] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
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
      setCompany(companyData);
      if (companyData) {
        const techRes = await fetch('/api/technicians', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const techData = await techRes.json();
        setTechnicians(techData);

        const subRes = await fetch('/api/subscription', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscription(subData);
          const trialExpired = !subData.trialEndsAt || new Date(subData.trialEndsAt).getTime() < Date.now();
          if (subData.status !== 'active' && trialExpired) {
            router.push('/upgrade');
            return;
          }
        }
      }
    };
    getUser();
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleSubscribe = async () => {
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
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok && data.url) {
      window.location.href = data.url;
    } else {
      setAppError(data.error || 'Unable to start checkout. Please try again.');
      setLoadingCheckout(false);
    }
  };

  const handleManageSubscription = async () => {
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
      setLoadingPortal(false);
    }
  };

  const handleAddTechnician = async (name: string, email: string) => {
    setAddingTech(true);
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
    } else {
      const err = await res.json();
      setAppError(err.error || 'Unable to add technician');
    }
    setAddingTech(false);
  };

  const handleRemoveTechnician = async (technicianId: string) => {
    if (!confirm('Are you sure you want to remove this technician?')) return;
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
    }
  };

  if (!user) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-offwhite">
      <Navbar 
        user={{ name: company?.name || company?.email || 'User', email: user?.email || '' }} 
        onSignOut={handleSignOut} 
      />
      <div className="flex lg:pl-0">
      <Sidebar 
        activeTab={activeTab as string} 
        onTabChange={(tab: string) => setActiveTab(tab as Tab)} 
        onSignOut={handleSignOut}
      />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 ml-0 lg:ml-64">
          {company ? (
            <>
              {appError && (
                <Card className="mb-6 border-red-200 bg-red-50">
                  <div className="text-red-800 p-4">
                    {appError}
                  </div>
                </Card>
              )}
              {activeTab === 'technicians' && (
                <TechniciansTab 
                  technicians={technicians} 
                  onAddTechnician={handleAddTechnician} 
                  onRemoveTechnician={handleRemoveTechnician} 
                />
              )}
              {activeTab === 'logbook' && (
                <LogbookTab companyId={company.id} technicians={technicians} />
              )}
              {activeTab === 'settings' && (
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
    </div>
  );
}

// ========== Sub-Components ==========

function CompanySetupTab() {
  return (
    <div className="max-w-md mx-auto">
      <Card>
        <h2 className="text-2xl font-bold text-navy mb-4 text-center">Welcome to PestLog!</h2>
        <p className="text-zinc-600 mb-6 text-center">Let&apos;s set up your pest control company to get started.</p>
        <CompanySetupForm />
      </Card>
    </div>
  );
}

function CompanySetupForm() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('You must be logged in');
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
      alert('Error creating company');
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
      <Button type="submit" fullWidth disabled={loading} size="lg">
        {loading ? 'Creating...' : 'Create Company'}
      </Button>
    </form>
  );
}

function TechniciansTab({ technicians, onAddTechnician, onRemoveTechnician }: {
  technicians: Technician[];
  onAddTechnician: (name: string, email: string) => void;
  onRemoveTechnician: (id: string) => void;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onAddTechnician(name, email);
    setName('');
    setEmail('');
    setShowAddForm(false);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-navy">Technicians</h2>
        <Button 
          onClick={() => setShowAddForm(true)} 
          size="lg"
          className="w-full sm:w-auto"
        >
          + Add Technician
        </Button>
      </div>

      {technicians.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-zinc-600 text-lg">No technicians yet. Add your first technician above.</p>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <Card className="overflow-hidden">
            <table className="w-full">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {technicians.map((tech) => (
                  <tr key={tech.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-navy">{tech.name}</td>
                    <td className="px-6 py-4 text-zinc-600 text-sm">{tech.email}</td>
                    <td className="px-6 py-4">
                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => onRemoveTechnician(tech.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      {/* Add Technician Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowAddForm(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 space-y-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-navy mb-2">Add Technician</h3>
              <p className="text-zinc-600">Enter technician details to add them to your team.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Full Name"
                id="tech-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                required
              />
              <FormInput
                label="Email"
                id="tech-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@company.com"
                required
              />
              <div className="flex gap-3 pt-4">
                <Button 
                  type="button"
                  variant="secondary"
                  fullWidth
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary"
                  fullWidth
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Adding...
                    </>
                  ) : (
                    'Add Technician'
                  )}
                </Button>
              </div>
            </form>
          </div>
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
    doc.save(`pestlog-logbook-${Date.now()}.pdf`);
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
                {entry.photoUrl && (
                  <img src={entry.photoUrl} alt="Job photo" className="mt-4 w-full h-48 object-cover rounded-2xl border" />
                )}
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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/logbook-entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ companyId, date, clientName, address, treatment, notes, technicianId }),
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
    } else {
      alert('Error adding entry');
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
        value={technicianId}
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
      <div className="md:col-span-2 pt-2">
        <Button type="submit" fullWidth size="lg" disabled={loading}>
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-bold text-navy">Settings</h2>
      
      <Card className="space-y-6 p-8">
        <div>
          <h3 className="text-xl font-bold text-navy mb-4">Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-zinc-600 mb-1">Company Name</p>
              <p className="text-lg font-bold text-navy">{company.name || company.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-600 mb-1">Email</p>
              <p className="text-lg font-bold text-navy break-all">{company.email}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold text-navy mb-4">Subscription</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-zinc-600 mb-1">Status</p>
              <span className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${
                subscription?.status === 'active' 
                  ? 'bg-green-100 text-green-800'
                  : subscription?.status === 'trial'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-zinc-100 text-zinc-800'
              }`}>
                {subscription?.status?.toUpperCase() || 'No Plan'}
              </span>
            </div>
            {subscription?.trialEndsAt && (
              <div>
                <p className="text-sm font-medium text-zinc-600 mb-1">Trial Ends</p>
                <p className="text-lg font-bold text-navy">{new Date(subscription.trialEndsAt).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </div>

        <div className="pt-6 border-t border-zinc-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {subscription?.status === 'active' ? (
              <Button 
                onClick={onManageSubscription} 
                size="lg"
                disabled={portalLoading}
                className="flex-1"
              >
                {portalLoading ? (
                  <>
                    <span className="spinner"></span>
                    Opening Portal...
                  </>
                ) : (
                  'Manage Subscription'
                )}
              </Button>
            ) : (
              <Button 
                onClick={onSubscribe} 
                variant="primary"
                size="lg"
                disabled={checkoutLoading}
                className="flex-1"
              >
                {checkoutLoading ? (
                  <>
                    <span className="spinner"></span>
                    Redirecting...
                  </>
                ) : (
                  'Upgrade to Pro'
                )}
              </Button>
            )}
      <Button 
        onClick={() => router.push('/reports')}
        variant="secondary"
        size="lg"
      >
        View Reports
      </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

