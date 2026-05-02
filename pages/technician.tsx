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
  rooms?: Array<string | { name: string; note?: string }>;
  baitBoxesPlaced?: string;
  poisonUsed?: string;
  followUpDate?: string;
  photoUrl?: string;
  photoUrls?: string[];
  photos?: { url: string }[];
  signature?: string;
  price?: number;
};

type Certification = {
  id: string;
  fileUrl: string;
  expiryDate?: string | null;
  uploadedAt: string;
  signedUrl?: string;
};

type RoomForm = {
  name: string;
  note: string;
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
  'Emergency Pest Call-out',
  'Rodent Control - Rats',
  'Rodent Control - Mice',
  'Squirrel Control',
  'Rabbit Control',
  'Mole Control',
  'Bed Bug Treatment',
  'Flea Treatment',
  'Cockroach Treatment',
  'Ant Treatment',
  'Wasp Nest Treatment',
  'Hornet Nest Treatment',
  'Fly Control',
  'Cluster Fly Treatment',
  'Moth Treatment',
  'Carpet Beetle Treatment',
  'Silverfish Treatment',
  'Stored Product Insect Treatment',
  'Spider Control',
  'Woodlice Control',
  'Termite Inspection/Treatment',
  'Bird Control - Pigeon Proofing',
  'Bird Control - Gull Deterrent',
  'Bird Mite Treatment',
  'Drain Survey and Treatment',
  'Drain Fly Treatment',
  'Fogging Treatment',
  'ULV Treatment',
  'Heat Treatment',
  'Fumigation Service',
  'Sanitisation/Disinfection',
  'Proofing/Exclusion Work',
  'Follow-up Inspection',
  'Monitoring Visit',
  'Bait Station Service',
  'Audit/Compliance Inspection',
];

export default function TechnicianPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const isPreviewMode = process.env.NODE_ENV === 'development' && router.query.preview === '1';
  const accessDeniedTarget = typeof router.query.accessDenied === 'string' ? router.query.accessDenied : '';
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<TechnicianProfile | null>(null);
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [date, setDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [treatment, setTreatment] = useState(treatments[0]);
  const [notes, setNotes] = useState('');
  const [rooms, setRooms] = useState<RoomForm[]>([]);
  const [baitBoxesPlaced, setBaitBoxesPlaced] = useState('');
  const [poisonUsed, setPoisonUsed] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [certExpiryDate, setCertExpiryDate] = useState('');
  const [certUploading, setCertUploading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  const addRoom = () => {
    setRooms((prev) => [...prev, { name: '', note: '' }]);
  };

  const updateRoom = (index: number, field: keyof RoomForm, value: string) => {
    setRooms((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeRoom = (index: number) => {
    setRooms((prev) => prev.filter((_, i) => i !== index));
  };

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
          rooms: ['Kitchen', 'Storage'],
          baitBoxesPlaced: '6',
          poisonUsed: 'Rodenticide bait blocks',
          followUpDate: new Date(Date.now() + 7 * 86400000).toISOString(),
          },
          {
            id: 'preview-2',
            date: new Date(Date.now() - 86400000).toISOString(),
            clientName: 'City Warehouse Ltd',
            address: '12 Industrial Estate, Leeds',
            treatment: 'Rodent Monitoring',
            notes: 'Quarterly inspection completed. No activity detected.',
          rooms: ['Warehouse floor'],
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

  useEffect(() => {
    const loadCertifications = async () => {
      if (!profile) return;

      if (isPreviewMode) {
        setCertifications([
          {
            id: 'preview-cert-1',
            fileUrl: '/icon-192.png',
            uploadedAt: new Date().toISOString(),
            expiryDate: new Date(Date.now() + 31536000000).toISOString(),
            signedUrl: '/icon-192.png',
          },
        ]);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/technicians/${profile.id}/certifications`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;

      const data = (await res.json()) as Certification[];
      const signed = await Promise.all(
        data.map(async (cert) => {
          const { data: signedData } = await supabase.storage
            .from('logbook-photos')
            .createSignedUrl(cert.fileUrl, 3600);
          return {
            ...cert,
            signedUrl: signedData?.signedUrl || cert.fileUrl,
          };
        }),
      );
      setCertifications(signed);
    };

    void loadCertifications();
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
    const uploadResults = await Promise.all(
      selectedFiles.map(async (file, index) => {
        const sanitizedFileName = file.name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-._]/g, '');
        const filePath = `${profile.companyId}/${profile.id}/${Date.now()}-${index}-${sanitizedFileName}`;
        const { error: uploadError } = await supabase.storage
          .from('logbook-photos')
          .upload(filePath, file, {
            cacheControl: '3600',
            contentType: file.type,
            upsert: false,
          });
        return { filePath, uploadError };
      }),
    );

    const failedUpload = uploadResults.find((result) => result.uploadError);
    if (failedUpload?.uploadError) {
      showToast('Photo upload failed', failedUpload.uploadError.message, 'error');
      console.error('Photo upload failed:', failedUpload.uploadError);
      setPhotoUploading(false);
      return;
    }

    setPhotoUrls(uploadResults.map((result) => result.filePath));
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
          rooms: rooms
            .map((room) => room.name.trim())
            .filter((room) => room.length > 0),
          baitBoxesPlaced,
          poisonUsed,
          followUpDate: followUpDate || undefined,
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
      setRooms([]);
      setBaitBoxesPlaced('');
      setPoisonUsed('');
      setFollowUpDate('');
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
        rooms: rooms
          .map((room) => room.name.trim())
          .filter((room) => room.length > 0),
        baitBoxesPlaced,
        poisonUsed,
        followUpDate: followUpDate || undefined,
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
      setRooms([]);
      setBaitBoxesPlaced('');
      setPoisonUsed('');
      setFollowUpDate('');
      setPhotoUrls([]);
      setPhotoPreviewUrls([]);
      clearSignature();
    } else {
      const err = await res.json().catch(() => ({ error: 'Could not save entry' }));
      const message = err.details ? `${err.error || 'Could not save entry'}: ${err.details}` : (err.error || 'Could not save entry');
      console.error('Technician logbook save failed', err);
      showToast('Save failed', message, 'error');
    }

    setSubmitting(false);
  };

  const handleCertificateUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !profile) return;

    const file = files[0];
    if (isPreviewMode) {
      setCertifications((prev) => [
        {
          id: `preview-cert-${Date.now()}`,
          fileUrl: '/icon-192.png',
          signedUrl: '/icon-192.png',
          expiryDate: certExpiryDate || null,
          uploadedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setCertExpiryDate('');
      showToast('Preview mode', 'Certification stored locally in preview mode.', 'success');
      return;
    }

    setCertUploading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setCertUploading(false);
      router.push('/auth/signin');
      return;
    }

    const sanitizedFileName = file.name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-._]/g, '');
    const filePath = `${profile.id}/cert-${Date.now()}-${sanitizedFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('logbook-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        contentType: file.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      showToast('Upload failed', uploadError.message, 'error');
      setCertUploading(false);
      return;
    }

    const certRes = await fetch('/api/technicians/certifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        technicianId: profile.id,
        fileUrl: filePath,
        expiryDate: certExpiryDate || undefined,
      }),
    });

    if (!certRes.ok) {
      const err = await certRes.json().catch(() => ({ error: 'Unable to save certification' }));
      showToast('Upload failed', err.error || 'Unable to save certification', 'error');
      setCertUploading(false);
      return;
    }

    const refreshRes = await fetch(`/api/technicians/${profile.id}/certifications`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (refreshRes.ok) {
      const data = (await refreshRes.json()) as Certification[];
      const signed = await Promise.all(
        data.map(async (cert) => {
          const { data: signedData } = await supabase.storage
            .from('logbook-photos')
            .createSignedUrl(cert.fileUrl, 3600);
          return {
            ...cert,
            signedUrl: signedData?.signedUrl || cert.fileUrl,
          };
        }),
      );
      setCertifications(signed);
    }

    setCertExpiryDate('');
    setCertUploading(false);
    showToast('Uploaded', 'Certification uploaded successfully.', 'success');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-offwhite">Loading technician dashboard...</div>;
  }

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center bg-offwhite">Access denied.</div>;
  }

  return (
    <div className="min-h-screen bg-offwhite">
      <div className="flex min-w-0">
        <Sidebar role="technician" activeTab="logbook" onSignOut={async () => {
          if (isPreviewMode) {
            router.push('/');
            return;
          }
          await supabase.auth.signOut();
          router.push('/auth/signin');
        }} />
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="min-w-0 max-w-5xl space-y-6">
        {accessDeniedTarget ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Access to owner-only {accessDeniedTarget === 'upgrade' ? 'billing/upgrade' : 'dashboard'} sections is restricted for technician accounts.
          </div>
        ) : null}
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

            {/* Rooms and Follow-up */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-group">
                <div className="flex items-center justify-between mb-2">
                  <label className="form-label mb-0">Rooms Worked In</label>
                  <button
                    type="button"
                    onClick={addRoom}
                    className="text-sm font-medium text-primary-700 hover:text-primary-800"
                  >
                    + Add room
                  </button>
                </div>
                {rooms.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500">
                    No rooms added yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rooms.map((room, index) => (
                      <div key={`${index}-${room.name}`} className="rounded-lg border border-gray-200 p-3">
                        <input
                          type="text"
                          value={room.name}
                          onChange={(e) => updateRoom(index, 'name', e.target.value)}
                          placeholder="Room name (e.g. Kitchen)"
                          className="form-input mb-2"
                        />
                        <input
                          type="text"
                          value={room.note}
                          onChange={(e) => updateRoom(index, 'note', e.target.value)}
                          placeholder="Optional room note"
                          className="form-input"
                        />
                        <button
                          type="button"
                          onClick={() => removeRoom(index)}
                          className="mt-2 text-xs font-medium text-red-600 hover:text-red-700"
                        >
                          Remove room
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="technician-entry-followup" className="form-label">Follow-up Date (optional)</label>
                <input
                  id="technician-entry-followup"
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="form-group">
                <label htmlFor="technician-entry-bait" className="form-label">Bait Boxes Placed</label>
                <input
                  id="technician-entry-bait"
                  type="text"
                  value={baitBoxesPlaced}
                  onChange={(e) => setBaitBoxesPlaced(e.target.value)}
                  placeholder="e.g. 6"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label htmlFor="technician-entry-poison" className="form-label">Poison Used</label>
                <input
                  id="technician-entry-poison"
                  type="text"
                  value={poisonUsed}
                  onChange={(e) => setPoisonUsed(e.target.value)}
                  placeholder="e.g. Bromadiolone blocks"
                  className="form-input"
                />
              </div>
            </div>

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

        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-navy mb-3">My Certifications</h2>
            <div className="mx-auto h-1 w-16 bg-primary-500 rounded-full"></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tech-cert-expiry" className="form-label">Expiry Date (optional)</label>
              <input
                id="tech-cert-expiry"
                type="date"
                value={certExpiryDate}
                onChange={(e) => setCertExpiryDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label htmlFor="tech-cert-file" className="form-label">Upload Certificate</label>
              <input
                id="tech-cert-file"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => void handleCertificateUpload(e.target.files)}
                className="form-input"
              />
              {certUploading ? <p className="mt-2 text-sm text-blue-600">Uploading certification...</p> : null}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {certifications.map((cert) => (
              <div key={cert.id} className="rounded-lg border border-gray-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Uploaded {new Date(cert.uploadedAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {cert.expiryDate ? `Expires ${new Date(cert.expiryDate).toLocaleDateString()}` : 'No expiry date set'}
                  </p>
                </div>
                <a
                  href={cert.signedUrl || cert.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  View certificate
                </a>
              </div>
            ))}
            {certifications.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500 text-center">
                No certifications uploaded yet.
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-navy">{entry.clientName}</h3>
                  <p className="text-sm text-gray-500">{new Date(entry.date).toLocaleDateString()}</p>
                </div>
                <span className="inline-flex max-w-full rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 break-words">{entry.treatment}</span>
              </div>
              <p className="mt-4 text-gray-700">{entry.address}</p>
              {entry.rooms && entry.rooms.length > 0 ? (
                <p className="mt-2 text-sm text-gray-600">
                  Rooms: {entry.rooms.map((room) => (typeof room === 'string' ? room : room.name)).join(', ')}
                </p>
              ) : null}
              {entry.followUpDate ? (
                <p className="mt-1 text-sm text-amber-700 font-medium">
                  Follow-up: {new Date(entry.followUpDate).toLocaleDateString()}
                </p>
              ) : null}
              {entry.baitBoxesPlaced ? <p className="mt-1 text-sm text-gray-600">Bait boxes: {entry.baitBoxesPlaced}</p> : null}
              {entry.poisonUsed ? <p className="mt-1 text-sm text-gray-600">Poison used: {entry.poisonUsed}</p> : null}
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
