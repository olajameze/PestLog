import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/router';

interface User {
  id: string;
  email?: string;
  // Add other fields as needed
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
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/signin');
      } else {
        setUser(session.user);
        // Check if user has company
        const res = await fetch('/api/company', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const companyData = await res.json();
        setCompany(companyData);
        if (companyData) {
          // Fetch technicians
          const techRes = await fetch('/api/technicians', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          const techData = await techRes.json();
          setTechnicians(techData);
          // Check subscription
          const subRes = await fetch('/api/subscription', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          const subData = await subRes.json();
          setSubscription(subData);
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
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    });
    const { url } = await res.json();
    window.location.href = url;
  };

  const handleAddTechnician = async (name: string, email: string) => {
    const { data: { session } } = await supabase.auth.getSession();
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
    }
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <button
            onClick={handleSignOut}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Sign Out
          </button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <p>Welcome, {user.email}!</p>
          {company ? (
            <div>
              <h2>Your Company: {company.name || company.email}</h2>
              <p>Subscription: {subscription ? subscription.status : 'None'}</p>
              {!subscription && (
                <button onClick={handleSubscribe} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
                  Subscribe
                </button>
              )}
              <TechniciansList technicians={technicians} onAddTechnician={handleAddTechnician} />
              <LogbookEntries companyId={company.id} technicians={technicians} />
            </div>
          ) : (
            <div>
              <h2>Set up your business</h2>
              <CompanySetupForm />
            </div>
          )}
        </div>
      </main>
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
      <div>
        <label className="block text-sm font-medium text-gray-700">Company Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Enter company name"
          aria-label="Company Name"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {loading ? 'Creating...' : 'Create Company'}
      </button>
    </form>
  );
}

function TechniciansList({ technicians, onAddTechnician }: { technicians: Technician[], onAddTechnician: (name: string, email: string) => void }) {
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
    <div className="mt-8">
      <h3 className="text-lg font-medium">Technicians</h3>
      <ul className="mt-2">
        {technicians.map((tech) => (
          <li key={tech.id}>{tech.name} ({tech.email})</li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            aria-label="Technician Name"
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-label="Technician Email"
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          {loading ? 'Adding...' : 'Add Technician'}
        </button>
      </form>
    </div>
  );
}

function LogbookEntries({ companyId, technicians }: { companyId: string, technicians: Technician[] }) {
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEntries = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/logbook-entries?companyId=${companyId}`, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
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
      <h3>Logbook Entries</h3>
      <button onClick={exportToPDF} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        Export to PDF
      </button>
      <AddLogbookEntryForm companyId={companyId} technicians={technicians} onAdd={(entry) => setEntries([...entries, entry])} />
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            {entry.date} - {entry.clientName} - {entry.address} - {entry.treatment}
          </li>
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
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          aria-label="Date"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Client Name</label>
        <input
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          required
          placeholder="Enter client name"
          aria-label="Client Name"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Address</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          placeholder="Enter address"
          aria-label="Address"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Treatment</label>
        <input
          type="text"
          value={treatment}
          onChange={(e) => setTreatment(e.target.value)}
          required
          placeholder="Enter treatment"
          aria-label="Treatment"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Technician</label>
        <select
          value={technicianId}
          onChange={(e) => setTechnicianId(e.target.value)}
          required
          aria-label="Technician"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        >
          <option value="">Select Technician</option>
          {technicians.map((tech) => (
            <option key={tech.id} value={tech.id}>{tech.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter notes"
          aria-label="Notes"
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        {loading ? 'Adding...' : 'Add Entry'}
      </button>
    </form>
  );
}