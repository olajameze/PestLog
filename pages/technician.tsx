import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

type TechnicianProfile = {
  id: string;
  name: string;
  email: string;
  companyId: string;
  companyName: string;
};

type LogbookEntry = {
  id: string;
  date: string;
  clientName: string;
  address: string;
  treatment: string;
  notes?: string;
  photoUrl?: string;
  signature?: string;
};

const treatments = [
  'General Pest Control',
  'Rodent Control',
  'Termite Treatment',
  'Mosquito Treatment',
  'Fumigation',
  'Inspection',
];

export default function TechnicianPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [date, setDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [treatment, setTreatment] = useState(treatments[0]);
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/signin');
        return;
      }

      const res = await fetch('/api/technician-profile', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        router.push('/dashboard');
        return;
      }

      const result = await res.json();
      setProfile(result.technician);

      const subRes = await fetch('/api/subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (subRes.ok) {
        const subData = await subRes.json();
        const trialExpired = !subData.trialEndsAt || new Date(subData.trialEndsAt).getTime() < Date.now();
        if (subData.status !== 'active' && trialExpired) {
          router.push('/upgrade');
          return;
        }
      }

      setLoading(false);
    };

    loadProfile();
  }, [router]);

  useEffect(() => {
    const loadEntries = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/technician-logbook', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const result = await res.json();
      setEntries(result);
    };

    if (profile) {
      loadEntries();
    }
  }, [profile]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl('');
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawing.current = true;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(event.clientX - rect.left, event.clientY - rect.top);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawing.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(event.clientX - rect.left, event.clientY - rect.top);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSignatureDataUrl(canvas.toDataURL('image/png'));
  };

  const handlePhotoChange = async (file: File) => {
    if (!profile) return;
    setPhotoUploading(true);
    const filePath = `${profile.id}/${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('logbook-photos')
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) {
      alert(error.message);
      setPhotoUploading(false);
      return;
    }

    const { data: publicData } = supabase.storage.from('logbook-photos').getPublicUrl(filePath);
    setPhotoUrl(publicData.publicUrl);
    setPhotoFile(file);
    setPhotoUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    const res = await fetch('/api/technician-logbook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        date,
        clientName,
        address,
        treatment,
        notes,
        photoUrl,
        signature: signatureDataUrl,
      }),
    });

    if (res.ok) {
      const entry = await res.json();
      setEntries([entry, ...entries]);
      setDate('');
      setClientName('');
      setAddress('');
      setTreatment(treatments[0]);
      setNotes('');
      setPhotoFile(null);
      setPhotoUrl('');
      clearSignature();
    } else {
      const err = await res.json();
      alert(err.error || 'Could not save entry');
    }

    setSubmitting(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-offwhite">Loading technician dashboard...</div>;
  }

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center bg-offwhite">Access denied.</div>;
  }

  return (
    <div className="min-h-screen bg-offwhite px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-navy">Technician Logbook</h1>
              <p className="text-sm text-gray-600">Signed in as {profile.name} ({profile.email})</p>
              <p className="text-sm text-gray-500">Company: {profile.companyName}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="text-2xl font-semibold text-navy mb-4">Add New Entry</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="technician-entry-date" className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  id="technician-entry-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-2xl px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="technician-entry-client" className="block text-sm font-medium text-gray-700">Client Name</label>
                <input
                  id="technician-entry-client"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  placeholder="Client name"
                  className="mt-1 block w-full border border-gray-300 rounded-2xl px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="technician-entry-address" className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  id="technician-entry-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                  placeholder="Job address"
                  className="mt-1 block w-full border border-gray-300 rounded-2xl px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="technician-entry-treatment" className="block text-sm font-medium text-gray-700">Treatment</label>
                <select
                  id="technician-entry-treatment"
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-2xl px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {treatments.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="technician-entry-photo" className="block text-sm font-medium text-gray-700">Optional Photo</label>
                <input
                  id="technician-entry-photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handlePhotoChange(e.target.files[0])}
                  className="mt-1 block w-full text-sm text-gray-600"
                />
                {photoUrl && (
                  <p className="mt-2 text-sm text-green-700">Photo uploaded successfully.</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="technician-entry-notes" className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                id="technician-entry-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Enter treatment and observations"
                className="mt-1 block w-full border border-gray-300 rounded-2xl px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">E-signature</label>
                <button type="button" onClick={clearSignature} className="text-sm text-blue-600 hover:text-blue-800">Clear</button>
              </div>
              <div className="rounded-2xl border border-gray-300 overflow-hidden shadow-sm">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={200}
                  className="w-full h-48 bg-white"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                />
              </div>
              <p className="text-sm text-gray-500">Use your finger or mouse to sign above, then submit the entry.</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex justify-center rounded-2xl bg-blue-600 px-6 py-3 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Saving entry...' : 'Save Entry'}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-navy">{entry.clientName}</h3>
                  <p className="text-sm text-gray-500">{new Date(entry.date).toLocaleDateString()}</p>
                </div>
                <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">{entry.treatment}</span>
              </div>
              <p className="mt-4 text-gray-700">{entry.address}</p>
              {entry.notes && <p className="mt-2 text-gray-600 whitespace-pre-line">{entry.notes}</p>}
              {entry.photoUrl && (
                <img src={entry.photoUrl} alt="Logged job photo" className="mt-4 max-h-60 w-full object-cover rounded-2xl border border-gray-200" />
              )}
              {entry.signature && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Signature</p>
                  <img src={entry.signature} alt="Job signature" className="w-full max-h-40 object-contain rounded-2xl border border-gray-200" />
                </div>
              )}
            </div>
          ))}

          {entries.length === 0 && (
            <div className="bg-white rounded-2xl shadow-md p-6 text-center text-gray-600">
              No logbook entries yet. Add the first entry above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
