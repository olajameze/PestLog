import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/sidebar';
import { useToast } from '../components/ui/ToastProvider';

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
  photoUrls?: string[];
  photos?: { url: string }[];
  signature?: string;
};

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
  const { showToast } = useToast();
  const isPreviewMode = process.env.NODE_ENV === 'development' && router.query.preview === '1';
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [date, setDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [treatment, setTreatment] = useState(treatments[0]);
  const [notes, setNotes] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (isPreviewMode) {
        setProfile({
          id: 'preview-tech',
          name: 'John Smith',
          email: 'john@preview.local',
          companyId: 'preview-company',
          companyName: 'Pest Trace Preview Co.',
        });
        setLoading(false);
        return;
      }

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
          router.replace('/upgrade');
          return;
        }
      }

      setLoading(false);
    };

    loadProfile();
  }, [isPreviewMode, router]);

  useEffect(() => {
    const loadEntries = async () => {
      if (isPreviewMode) {
        setEntries([
          {
            id: 'preview-1',
            date: new Date().toISOString(),
            clientName: 'Riverside Restaurant',
            address: '45 High Street, Manchester',
            treatment: 'Rodenticide Bait Stations',
            notes: 'Installed 6 bait stations in kitchen and storage areas.',
          },
          {
            id: 'preview-2',
            date: new Date(Date.now() - 86400000).toISOString(),
            clientName: 'City Warehouse Ltd',
            address: '12 Industrial Estate, Leeds',
            treatment: 'Rodent Monitoring',
            notes: 'Quarterly inspection completed. No activity detected.',
          },
        ]);
        return;
      }

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
  }, [isPreviewMode, profile]);

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
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    isDrawing.current = true;
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Calculate scale factor between display size and internal canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Scale coordinates to match internal canvas size
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();

    // Calculate scale factor between display size and internal canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Scale coordinates to match internal canvas size
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
    event.preventDefault();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    setSignatureDataUrl(canvas.toDataURL('image/png'));
    event.preventDefault();
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    setSignatureDataUrl(canvas.toDataURL('image/png'));
    event.preventDefault();
  };

  const handlePhotoChange = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const selectedFiles = Array.from(files).slice(0, 4);
    const previewUrls = selectedFiles.map((file) => URL.createObjectURL(file));
    setPhotoPreviewUrls(previewUrls);

    if (isPreviewMode) {
      setPhotoUrls(previewUrls);
      showToast('Preview mode', 'Using local preview image only.', 'info');
      return;
    }

    if (!profile) return;
    setPhotoUploading(true);
    const uploadedPaths: string[] = [];

    for (const file of selectedFiles) {
      const sanitizedFileName = file.name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-._]/g, '');
      const filePath = `${profile.companyId}/${profile.id}/${Date.now()}-${sanitizedFileName}`;
      const { error: uploadError } = await supabase.storage
        .from('logbook-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        showToast('Photo upload failed', uploadError.message, 'error');
        console.error('Photo upload failed:', uploadError);
        setPhotoUploading(false);
        return;
      }

      uploadedPaths.push(filePath);
    }

    setPhotoUrls(uploadedPaths);
    setPhotoUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);

    if (isPreviewMode) {
      setEntries((prev) => [
        {
          id: `preview-${Date.now()}`,
          date: date || new Date().toISOString(),
          clientName,
          address,
          treatment,
          notes,
          photoUrl: photoUrls[0],
          photoUrls,
          signature: signatureDataUrl,
        },
        ...prev,
      ]);
      setDate('');
      setClientName('');
      setAddress('');
      setTreatment(treatments[0]);
      setNotes('');
      setPhotoUrls([]);
      setPhotoPreviewUrls([]);
      clearSignature();
      showToast('Preview mode', 'Entry saved locally in preview mode.', 'success');
      setSubmitting(false);
      return;
    }

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
        photoUrl: photoUrls[0],
        photoUrls,
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
      setPhotoUrls([]);
      setPhotoPreviewUrls([]);
      clearSignature();
    } else {
      const err = await res.json();
      const message = err.details ? `${err.error || 'Could not save entry'}: ${err.details}` : (err.error || 'Could not save entry');
      console.error('Technician logbook save failed', err);
      showToast('Save failed', message, 'error');
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
    <div className="min-h-screen bg-offwhite">
      <div className="flex">
        <Sidebar activeTab="logbook" onSignOut={async () => {
          if (isPreviewMode) {
            router.push('/');
            return;
          }
          await supabase.auth.signOut();
          router.push('/auth/signin');
        }} />
        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-5xl space-y-6">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-navy mb-3">Technician Logbook</h1>
            <div className="mx-auto h-1 w-16 bg-primary-500 rounded-full mb-4"></div>
            <p className="text-sm text-gray-600">Signed in as {profile.name} ({profile.email})</p>
            <p className="text-sm text-gray-500">Company: {profile.companyName}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-navy mb-3">Add New Entry</h2>
            <div className="mx-auto h-1 w-16 bg-primary-500 rounded-full"></div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date and Client Name Row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-group">
                <label htmlFor="technician-entry-date" className="form-label">Date <span className="text-red-500">*</span></label>
                <input
                  id="technician-entry-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="technician-entry-client" className="form-label">Client Name <span className="text-red-500">*</span></label>
                <input
                  id="technician-entry-client"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                  placeholder="Client name"
                  className="form-input"
                />
              </div>
            </div>

            {/* Address Row */}
            <div className="form-group">
              <label htmlFor="technician-entry-address" className="form-label">Address <span className="text-red-500">*</span></label>
              <input
                id="technician-entry-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                placeholder="Job address"
                className="form-input"
              />
            </div>

            {/* Treatment and Photo Row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-group">
                <label htmlFor="technician-entry-treatment" className="form-label">Treatment <span className="text-red-500">*</span></label>
                <select
                  id="technician-entry-treatment"
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                  required
                  className="form-select"
                >
                  {treatments.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="technician-entry-photo" className="form-label">Optional Photos (up to 4)</label>
                <input
                  id="technician-entry-photo"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => void handlePhotoChange(e.target.files)}
                  className="form-input"
                />
                {photoUploading && (
                  <p className="mt-2 text-sm text-blue-600 flex items-center gap-1">
                    <span className="spinner-dark"></span> Uploading photo...
                  </p>
                )}
                {photoPreviewUrls.length > 0 && !photoUploading && (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-green-600">✓ {photoPreviewUrls.length} photo(s) uploaded successfully.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {photoPreviewUrls.map((url) => (
                        <Image key={url} src={url} alt="Uploaded job photo preview" width={400} height={200} className="h-24 w-full rounded-lg border object-cover" unoptimized />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label htmlFor="technician-entry-notes" className="form-label">Additional Notes</label>
              <textarea
                id="technician-entry-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Enter treatment substances, observations, and any notes about the job..."
                className="form-textarea"
              />
            </div>

            {/* Signature Canvas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="form-label mb-0">E-Signature</label>
                {signatureDataUrl && (
                  <button 
                    type="button" 
                    onClick={clearSignature} 
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Clear Signature
                  </button>
                )}
              </div>
              <div className="rounded-lg border-2 border-gray-300 overflow-hidden bg-white shadow-sm">
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={200}
                  className="signature-canvas w-full"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerCancel}
                  onPointerCancel={handlePointerCancel}
                />
              </div>
              <p className="mt-2 text-xs sm:text-sm text-gray-500">👆 Use your finger or mouse to draw your signature above</p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary btn-lg hover-lift"
              >
                {submitting ? (
                  <>
                    <span className="spinner"></span>
                    <span>Saving entry...</span>
                  </>
                ) : (
                  '✓ Save Entry'
                )}
              </button>
            </div>
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
              {parsePhotoUrls(entry.photoUrl, entry.photoUrls, entry.photos).length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {parsePhotoUrls(entry.photoUrl, entry.photoUrls, entry.photos).map((url) => (
              <Image
                        key={url}
                        loader={supabaseImageLoader}
                        src={url}
                        alt="Logged job photo"
                        width={800}
                        height={400}
                        className="max-h-52 w-full object-cover rounded-2xl border border-gray-200"
                        unoptimized
                      />
                  ))}
                </div>
              ) : null}
              {entry.signature && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Signature</p>
                  <Image
                    src={entry.signature}
                    alt="Job signature"
                    width={1200}
                    height={400}
                    className="w-full max-h-40 object-contain rounded-2xl border border-gray-200"
                    unoptimized
                  />
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
      </div>
    </div>
  );
}
