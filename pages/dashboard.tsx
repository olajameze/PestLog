import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

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

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('technicians');
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
      } else {
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

    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
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

    const res = await fetch('/api/create-portal-session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token}` },
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

    const res = await fetch('/api/technicians', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
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
    const res = await fetch(`/api/technicians?id=${technicianId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.ok) {
      setTechnicians(technicians.filter(t => t.id !== technicianId));
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-offwhite">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-gray-600 opacity-75"></div>
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-navy">PestLog</h2>
            <button onClick={() => setSidebarOpen(false)} aria-label="Close menu" className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500">✕</button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            <button onClick={() => { setActiveTab('technicians'); setSidebarOpen(false); }} className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeTab === 'technicians' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Technicians</button>
            <button onClick={() => { setActiveTab('logbook'); setSidebarOpen(false); }} className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeTab === 'logbook' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Logbook</button>
            <button onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }} className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Settings</button>
          </nav>
          <div className="p-4 border-t border-gray-200">
            <button onClick={handleSignOut} className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors">Sign Out</button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <button onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500">☰</button>
            <h1 className="text-2xl font-bold text-navy">
              {activeTab === 'technicians' && 'Technicians'}
              {activeTab === 'logbook' && 'Logbook Entries'}
              {activeTab === 'settings' && 'Settings'}
            </h1>
            <div className="flex items-center space-x-4">
              {company && <span className="text-sm text-gray-600">{company.name || company.email}</span>}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {company ? (
            <>
              {appError && (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                  {appError}
                </div>
              )}
              {activeTab === 'technicians' && <TechniciansTab technicians={technicians} onAddTechnician={handleAddTechnician} onRemoveTechnician={handleRemoveTechnician} />}
              {activeTab === 'logbook' && <LogbookTab companyId={company.id} technicians={technicians} />}
              {activeTab === 'settings' && <SettingsTab company={company} subscription={subscription} onSubscribe={handleSubscribe} onManageSubscription={handleManageSubscription} checkoutLoading={loadingCheckout} portalLoading={loadingPortal} />}
            </>
          ) : (
            <CompanySetupTab />
          )}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex">
          <button onClick={() => setActiveTab('technicians')} className={`flex-1 py-3 text-center transition-colors ${activeTab === 'technicians' ? 'text-blue-600' : 'text-gray-600'}`}>👥 Technicians</button>
          <button onClick={() => setActiveTab('logbook')} className={`flex-1 py-3 text-center transition-colors ${activeTab === 'logbook' ? 'text-blue-600' : 'text-gray-600'}`}>📝 Logbook</button>
          <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3 text-center transition-colors ${activeTab === 'settings' ? 'text-blue-600' : 'text-gray-600'}`}>⚙️ Settings</button>
        </div>
      </div>
    </div>
  );
}

// ========== Components ==========

function CompanySetupForm() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/company', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
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
      <div className="form-group">
        <label htmlFor="company-name" className="form-label">Company Name</label>
        <input
          id="company-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Enter company name"
          className="form-input"
        />
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary hover-lift">
        {loading ? 'Creating...' : 'Create Company'}
      </button>
    </form>
  );
}

function CompanySetupTab() {
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold text-navy mb-4">Welcome to PestLog!</h2>
        <p className="text-gray-600 mb-6">Let&apos;s set up your pest control company to get started.</p>
        <CompanySetupForm />
      </div>
    </div>
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
        <button 
          onClick={() => setShowAddForm(true)} 
          className="btn btn-primary hover-lift w-full sm:w-auto"
        >
          + Add Technician
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block bg-white rounded-xl shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {technicians.map((tech) => (
              <tr key={tech.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tech.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{tech.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => onRemoveTechnician(tech.id)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards view */}
      <div className="lg:hidden space-y-3">
        {technicians.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-5 text-center text-gray-600">
            No technicians yet
          </div>
        ) : (
          technicians.map((tech) => (
            <div key={tech.id} className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-semibold text-navy">{tech.name}</p>
                  <p className="text-sm text-gray-600 break-all">{tech.email}</p>
                </div>
                <button
                  onClick={() => onRemoveTechnician(tech.id)}
                  className="btn btn-danger btn-sm whitespace-nowrap flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Technician Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 space-y-4">
            <h3 className="text-xl font-bold text-navy">Add Technician</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-group">
                <label htmlFor="tech-name" className="form-label">Technician Name</label>
                <input
                  id="tech-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Full name"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="tech-email" className="form-label">Email Address</label>
                <input
                  id="tech-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@example.com"
                  className="form-input"
                />
              </div>
              <div className="btn-group-full pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="btn btn-primary"
                >
                  {loading ? 'Adding...' : 'Add Technician'}
                </button>
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
      const data = await res.json();
      setEntries(data);
      setLoading(false);
    };
    fetchEntries();
  }, [companyId]);

  const exportToPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.text('Pest Control Log', 10, 10);
    entries.forEach((entry, index) => {
      doc.text(`${entry.date}: ${entry.clientName} - ${entry.address} - ${entry.treatment}`, 10, 20 + index * 10);
    });
    doc.save('log.pdf');
  };

  if (loading) return <div>Loading entries...</div>;

  return (
    <div>
      <h3 className="text-xl font-semibold mb-4">Logbook Entries</h3>
      <button onClick={exportToPDF} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Export to PDF</button>
      <AddLogbookEntryForm companyId={companyId} technicians={technicians} onAdd={(entry) => setEntries([...entries, entry])} />
      <ul className="mt-4 space-y-2">
        {entries.map((entry) => (
          <li key={entry.id} className="p-3 bg-gray-50 rounded">{entry.date} - {entry.clientName} - {entry.address} - {entry.treatment}</li>
        ))}
      </ul>
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
      setDate(''); setClientName(''); setAddress(''); setTreatment(''); setNotes(''); setTechnicianId('');
    } else {
      alert('Error adding entry');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4 p-4 border rounded-lg">
      <div>
        <label htmlFor="entry-date" className="block text-sm font-medium text-gray-700">Date</label>
        <input
          id="entry-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <div>
        <label htmlFor="entry-client-name" className="block text-sm font-medium text-gray-700">Client Name</label>
        <input
          id="entry-client-name"
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          required
          placeholder="Enter client name"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <div>
        <label htmlFor="entry-address" className="block text-sm font-medium text-gray-700">Address</label>
        <input
          id="entry-address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          placeholder="Enter address"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <div>
        <label htmlFor="entry-treatment" className="block text-sm font-medium text-gray-700">Treatment</label>
        <input
          id="entry-treatment"
          type="text"
          value={treatment}
          onChange={(e) => setTreatment(e.target.value)}
          required
          placeholder="Enter treatment"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <div>
        <label htmlFor="entry-technician" className="block text-sm font-medium text-gray-700">Technician</label>
        <select
          id="entry-technician"
          value={technicianId}
          onChange={(e) => setTechnicianId(e.target.value)}
          required
          aria-label="Select technician"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        >
          <option value="">Select Technician</option>
          {technicians.map((tech) => (
            <option key={tech.id} value={tech.id}>{tech.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="entry-notes" className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          id="entry-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter notes"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">{loading ? 'Adding...' : 'Add Entry'}</button>
    </form>
  );
}

function SettingsTab({ company, subscription, onSubscribe, onManageSubscription, checkoutLoading, portalLoading }: { company: Company; subscription: Subscription | null; onSubscribe: () => void; onManageSubscription: () => void; checkoutLoading: boolean; portalLoading: boolean }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-bold text-navy">Settings</h2>
      
      {/* Company Information Card */}
      <div className="bg-white rounded-xl shadow-md hover-lift p-6 space-y-4">
        <h3 className="text-lg font-semibold text-navy">Company Information</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Company Name</p>
            <p className="text-base font-semibold text-gray-900">{company.name || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email Address</p>
            <p className="text-base font-semibold text-gray-900 break-all">{company.email}</p>
          </div>
        </div>
      </div>

      {/* Subscription Card */}
      <div className="bg-white rounded-xl shadow-md hover-lift p-6 space-y-4">
        <h3 className="text-lg font-semibold text-navy">Subscription</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Current Status</p>
            <p className="text-base font-semibold text-gray-900">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                subscription?.status === 'active' 
                  ? 'bg-green-100 text-green-800'
                  : subscription?.status === 'trial'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {subscription?.status || 'None'}
              </span>
            </p>
          </div>
          {subscription?.trialEndsAt && (
            <div>
              <p className="text-sm text-gray-600">Trial Ends</p>
              <p className="text-base font-semibold text-gray-900">{new Date(subscription.trialEndsAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="pt-4">
          {subscription?.status === 'active' ? (
            <button 
              onClick={onManageSubscription} 
              disabled={portalLoading}
              className="btn btn-success hover-lift w-full sm:w-auto"
            >
              {portalLoading ? (
                <>
                  <span className="spinner"></span>
                  <span>Opening portal...</span>
                </>
              ) : (
                'Manage Subscription'
              )}
            </button>
          ) : (
            <button 
              onClick={onSubscribe} 
              disabled={checkoutLoading}
              className="btn btn-primary hover-lift w-full sm:w-auto"
            >
              {checkoutLoading ? (
                <>
                  <span className="spinner"></span>
                  <span>Redirecting...</span>
                </>
              ) : (
                'Upgrade to Pro'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}