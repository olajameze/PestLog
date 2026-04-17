
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/sidebar';
import Card from '../components/ui/Card';
import FormInput from '../components/ui/FormInput';
import { useToast } from '../components/ui/ToastProvider';

type Company = {
  id: string;
  name?: string;
  email: string;
};

type Technician = {
  id: string;
  name: string;
  email: string;
};



type ReportEntry = {
  id: string;
  date: string;
  clientName: string;
  address: string;
  treatment: string;
  notes?: string;
  rooms?: Array<string | { name: string; note?: string }>;
  baitBoxesPlaced?: string;
  poisonUsed?: string;
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

type RoomForm = {
  name: string;
  note: string;
};

function parseRoomForms(rooms?: Array<string | { name: string; note?: string }>): RoomForm[] {
  if (!rooms) return [];
  return rooms.map((room) => {
    if (typeof room === 'string') {
      return { name: room, note: '' };
    }
    return { name: room.name || '', note: room.note || '' };
  });
}

function formatRoomSummary(rooms?: Array<string | { name: string; note?: string }>) {
  if (!rooms?.length) return '';
  return rooms
    .map((room) => (typeof room === 'string' ? room : room.name))
    .filter(Boolean)
    .join(', ');
}

function parsePhotoUrls(photoUrl?: string, photoUrls?: string[], photos?: { url: string }[]): string[] {
  const candidateUrls = [
    ...(Array.isArray(photos) ? photos.map((photo) => photo.url) : []),
    ...(Array.isArray(photoUrls) ? photoUrls : []),
  ];

  if (candidateUrls.length > 0) {
    return Array.from(new Set(candidateUrls.filter((url) => Boolean(url) && isRenderableImageSrc(url)))).slice(0, 4);
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

function buildCertDownloadUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  return `/api/storage/download?path=${encodeURIComponent(url)}`;
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const mime = response.headers.get('content-type') || 'image/jpeg';
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return `data:${mime};base64,${base64}`;
}

type Certification = {
  id: string;
  fileUrl: string;
  expiryDate?: string;
  uploadedAt: string;
};

type ReportResponse = {
  companyName: string;
  entries: ReportEntry[];
  certifications: Certification[];
};

export default function ReportsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const isPreviewMode = process.env.NODE_ENV === 'development' && router.query.preview === '1';
  const [company, setCompany] = useState<Company | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [isOwner, setIsOwner] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [upgradeConfirmedPlan, setUpgradeConfirmedPlan] = useState<string | null>(null);
  const [reportGeneratedMessage, setReportGeneratedMessage] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<null | {
    totalJobs: number;
    completedJobs: number;
    openJobs: number;
    averageDurationMinutes: number | null;
    averagePhotosPerJob: number;
    topTreatments: Array<{ treatment: string; count: number }>;
    technicianPerformance: Array<{ technicianName: string; jobs: number; averageDurationMinutes: number | null }>;
    routePlan: Array<{ address: string; clientName: string; scheduledAt: string; treatment: string }>;
    auditSummary: { missingPhotos: number; missingSignatures: number; missingStatus: number };
  }>(null);
  const [plan, setPlan] = useState<'trial' | 'pro' | 'business' | 'enterprise'>('trial');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingEntryState, setEditingEntryState] = useState<{
    date: string;
    clientName: string;
    address: string;
    treatment: string;
    notes: string;
    rooms: RoomForm[];
    baitBoxesPlaced: string;
    poisonUsed: string;
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [updatedEntryMessage, setUpdatedEntryMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadUserData = async () => {
      if (isPreviewMode) {
        const mockTechs = [
          { id: 'tech-1', name: 'John Smith', email: 'john@preview.local' },
          { id: 'tech-2', name: 'Sarah Johnson', email: 'sarah@preview.local' },
          { id: 'tech-3', name: 'Mike Williams', email: 'mike@preview.local' },
        ];
        setCompany({ id: 'preview-company', name: 'Pest Trace Preview Co.', email: 'owner@preview.local' });
        setTechnicians(mockTechs);
        setSelectedTechnician(mockTechs[0].id);
        setIsOwner(true);
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/signin');
        return;
      }

      // Try owner/company access first
      const companyRes = await fetch('/api/company', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (companyRes.ok) {
        const companyData = await companyRes.json();
        if (companyData) {
          setCompany(companyData);

          const subRes = await fetch('/api/subscription', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          if (subRes.ok) {
            const subData = await subRes.json();
            const queryPlan = typeof router.query.upgradedPlan === 'string' ? router.query.upgradedPlan : undefined;
            setPlan(
              queryPlan && (queryPlan === 'pro' || queryPlan === 'business')
                ? queryPlan
                : subData.plan || 'trial'
            );
            const trialExpired = !subData.trialEndsAt || new Date(subData.trialEndsAt).getTime() < Date.now();
            if (subData.status !== 'active' && trialExpired) {
              router.replace('/upgrade');
              return;
            }
          } else {
            const queryPlan = typeof router.query.upgradedPlan === 'string' ? router.query.upgradedPlan : undefined;
            if (queryPlan && (queryPlan === 'pro' || queryPlan === 'business')) {
              setPlan(queryPlan);
            }
          }

          const techRes = await fetch('/api/technicians', {
            headers: { Authorization: `Bearer ${session.access_token}` },
          });
          const techData = await techRes.json();
          setTechnicians(techData);
          setSelectedTechnician(techData[0]?.id ?? '');
          setIsOwner(true);
          setLoading(false);
          return;
        }
      }

      // Fallback to technician mode
      const techRes = await fetch('/api/technician-profile', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!techRes.ok) {
        router.push('/dashboard');
        return;
      }
      const techData = await techRes.json();
      setCompany({ 
        id: techData.technician.companyId, 
        name: techData.technician.companyName,
        email: techData.technician.companyId // placeholder
      });
      const subRes = await fetch('/api/subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (subRes.ok) {
        const subData = await subRes.json();
        const queryPlan = typeof router.query.upgradedPlan === 'string' ? router.query.upgradedPlan : undefined;
        setPlan(
          queryPlan && (queryPlan === 'pro' || queryPlan === 'business')
            ? queryPlan
            : subData.plan || 'trial'
        );
      } else {
        const queryPlan = typeof router.query.upgradedPlan === 'string' ? router.query.upgradedPlan : undefined;
        if (queryPlan && (queryPlan === 'pro' || queryPlan === 'business')) {
          setPlan(queryPlan);
        }
      }
      setTechnicians([{ id: techData.technician.id, name: techData.technician.name, email: techData.technician.email }]);
      setSelectedTechnician(techData.technician.id);
      setIsOwner(false);
      setLoading(false);
    };

    loadUserData();
  }, [isPreviewMode, router]);

  useEffect(() => {
    if (!router.isReady) return;
    const queryPlan = typeof router.query.upgradedPlan === 'string' ? router.query.upgradedPlan : undefined;
    if (!queryPlan) return;

    setUpgradeConfirmedPlan(queryPlan);
    if (queryPlan === 'pro' || queryPlan === 'business') {
      setPlan(queryPlan);
    }

    const planLabel = queryPlan.charAt(0).toUpperCase() + queryPlan.slice(1);
    showToast(
      'Subscription upgraded',
      `Your plan is now ${planLabel}. Enhanced reporting is available on this page.`,
      'success'
    );

    const refreshSubscriptionPlan = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch('/api/subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const subData = await res.json();
      if (subData.plan) {
        setPlan(subData.plan);
      }
    };

    refreshSubscriptionPlan();
    const refreshTimer = window.setTimeout(refreshSubscriptionPlan, 3000);

    const cleanedQuery = { ...router.query };
    delete cleanedQuery.upgradedPlan;
    delete cleanedQuery.session_id;
    router.replace(
      { pathname: router.pathname, query: cleanedQuery },
      undefined,
      { shallow: true }
    );

    return () => window.clearTimeout(refreshTimer);
  }, [router, showToast]);

  const fetchAnalytics = async (technicianId: string) => {
    setAnalyticsLoading(true);
    setAnalytics(null);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    const analyticsUrl = `/api/analytics?technicianId=${technicianId}&startDate=${startDate}&endDate=${endDate}`;
    const res = await fetch(analyticsUrl, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!res.ok) {
      setAnalyticsLoading(false);
      return;
    }

    const result = await res.json();
    setAnalytics(result);
    setAnalyticsLoading(false);
  };

  const [search, setSearch] = useState('');

  const fetchReport = async () => {
    if (!selectedTechnician || !startDate || !endDate) {
      showToast('Missing filters', 'Select a technician and date range first.', 'error');
      return;
    }

    setFetching(true);
    setReportGeneratedMessage(null);
    let apiUrl = `/api/reports?technicianId=${selectedTechnician}&startDate=${startDate}&endDate=${endDate}`;
    if (search.trim()) {
      apiUrl += `&search=${encodeURIComponent(search.trim())}`;
    }

    if (isPreviewMode) {
      const selectedName = technicians.find((t) => t.id === selectedTechnician)?.name || 'Technician';
      const previewReport = {
        companyName: company?.name || 'Pest Trace Preview Co.',
        entries: [
          {
            id: 'entry-1',
            date: startDate || new Date().toISOString(),
            clientName: 'Riverside Restaurant',
            address: '45 High Street, Manchester',
            treatment: 'Rodenticide Bait Stations',
            notes: 'Installed 6 bait stations and reviewed prevention advice.',
            photoUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200',
            photoUrls: ['https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200'],
          },
          {
            id: 'entry-2',
            date: endDate || new Date().toISOString(),
            clientName: 'City Warehouse Ltd',
            address: '12 Industrial Estate, Leeds',
            treatment: 'Rodent Monitoring',
            notes: 'Quarterly inspection complete with no active findings.',
            photoUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200',
            photoUrls: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200'],
          },
        ],
        certifications: [
          {
            id: 'cert-1',
            fileUrl: '#',
            uploadedAt: new Date().toISOString(),
            expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      };
      setReport(previewReport);
      setReportGeneratedMessage(`Preview report ready with ${previewReport.entries.length} jobs and ${previewReport.certifications.length} certifications.`);
      showToast('Preview mode', `Generated preview report for ${selectedName}.`, 'info');
      setFetching(false);
      return;
    }

    setFetching(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });

    if (!res.ok) {
      const error = await res.json();
      showToast('Report failed', error.error || 'Failed to load report', 'error');
      setFetching(false);
      return;
    }

    const result = await res.json();
    setReport(result);
    setReportGeneratedMessage(
      `Report ready with ${result.entries.length} jobs, ${result.certifications.length} certifications, and ${result.entries.reduce((count: number, entry: ReportEntry) => count + parsePhotoUrls(entry.photoUrl, entry.photoUrls, entry.photos).length, 0)} photos.`
    );
    if (plan === 'business' || plan === 'enterprise') {
      await fetchAnalytics(selectedTechnician);
    } else {
      setAnalytics(null);
    }
    setFetching(false);
  };

  const deleteReportEntry = async (entryId: string) => {
    if (!confirm('Delete this job from the report? This cannot be undone.')) return;
    setDeletingEntryId(entryId);

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/logbook-entries/${entryId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Failed to delete report entry' }));
      showToast('Delete failed', error.error || 'Failed to delete report entry', 'error');
      setDeletingEntryId(null);
      return;
    }

    setReport((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        entries: prev.entries.filter((entry) => entry.id !== entryId),
      };
    });
    showToast('Deleted', 'Job removed from report successfully.', 'success');
    setDeletingEntryId(null);
  };

  const startEditingEntry = (entry: ReportEntry) => {
    setEditingEntryId(entry.id);
    setEditingEntryState({
      date: entry.date,
      clientName: entry.clientName,
      address: entry.address,
      treatment: entry.treatment,
      notes: entry.notes || '',
      rooms: parseRoomForms(entry.rooms),
      baitBoxesPlaced: entry.baitBoxesPlaced || '',
      poisonUsed: entry.poisonUsed || '',
    });
  };

  const updateEditingRoom = (index: number, field: keyof RoomForm, value: string) => {
    if (!editingEntryState) return;
    const nextRooms = [...editingEntryState.rooms];
    nextRooms[index] = { ...nextRooms[index], [field]: value };
    setEditingEntryState({ ...editingEntryState, rooms: nextRooms });
  };

  const addEditingRoom = () => {
    if (!editingEntryState) return;
    setEditingEntryState({
      ...editingEntryState,
      rooms: [...editingEntryState.rooms, { name: '', note: '' }],
    });
  };

  const removeEditingRoom = (index: number) => {
    if (!editingEntryState) return;
    const nextRooms = editingEntryState.rooms.filter((_, i) => i !== index);
    setEditingEntryState({ ...editingEntryState, rooms: nextRooms });
  };

  const saveEditedEntry = async () => {
    if (!editingEntryId || !editingEntryState) return;
    if (!selectedTechnician) {
      showToast('Save failed', 'Select a technician before saving.', 'error');
      return;
    }

    setSavingEdit(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      router.push('/auth/signin');
      return;
    }

    const roomsPayload = editingEntryState.rooms
      .map((room) => ({ name: room.name.trim(), note: room.note.trim() }))
      .filter((room) => room.name.length > 0);

    const res = await fetch(`/api/logbook-entries/${editingEntryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        date: editingEntryState.date,
        clientName: editingEntryState.clientName,
        address: editingEntryState.address,
        treatment: editingEntryState.treatment,
        notes: editingEntryState.notes || undefined,
        technicianIds: [selectedTechnician],
        rooms: roomsPayload.length > 0 ? roomsPayload : undefined,
        baitBoxesPlaced: editingEntryState.baitBoxesPlaced || undefined,
        poisonUsed: editingEntryState.poisonUsed || undefined,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unable to save edit' }));
      showToast('Save failed', error.error || 'Failed to save report entry', 'error');
      setSavingEdit(false);
      return;
    }

    setReport((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        entries: prev.entries.map((entry) =>
          entry.id === editingEntryId
            ? {
                ...entry,
                date: editingEntryState.date,
                clientName: editingEntryState.clientName,
                address: editingEntryState.address,
                treatment: editingEntryState.treatment,
                notes: editingEntryState.notes,
                rooms: roomsPayload.length > 0 ? roomsPayload : undefined,
                baitBoxesPlaced: editingEntryState.baitBoxesPlaced || undefined,
                poisonUsed: editingEntryState.poisonUsed || undefined,
              }
            : entry
        ),
      };
    });

    showToast('Updated', 'Report entry updated successfully.', 'success');
    setUpdatedEntryMessage('Report entry updated successfully.');
    setEditingEntryId(null);
    setEditingEntryState(null);
    setSavingEdit(false);

    window.setTimeout(() => {
      setUpdatedEntryMessage(null);
    }, 4500);
  };

  const downloadPdf = async () => {
    if (!report || !company) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    const captionWidth = contentWidth - 8;
    let y = 24;

    const addHeader = () => {
      doc.setFillColor(14, 55, 121);
      doc.rect(0, 0, pageWidth, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text(company.name || company.email, margin, 14);
      doc.setFontSize(10);
      doc.text('Compliance Report • Pest Trace', margin, 24);
      doc.setFontSize(10);
      doc.text(`Period: ${new Date(startDate).toLocaleDateString()} — ${new Date(endDate).toLocaleDateString()}`, pageWidth - margin, 14, { align: 'right' });
      const technicianName = technicians.find((t) => t.id === selectedTechnician)?.name || 'All technicians';
      doc.text(`Technician: ${technicianName}`, pageWidth - margin, 24, { align: 'right' });
      y = 36;
    };

    const addFooter = () => {
      const pageCount = doc.getNumberOfPages();
      for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
        doc.setPage(pageIndex);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, pageHeight - 10);
        doc.text(`Page ${pageIndex} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      }
    };

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - 24) {
        doc.addPage();
        addHeader();
      }
    };

    addHeader();

    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text('Report overview', margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.setTextColor(75, 85, 99);
    const summaryItems = [
      `Total jobs included: ${report.entries.length}`,
      `Photos included: ${report.entries.reduce((count, entry) => count + parsePhotoUrls(entry.photoUrl, entry.photoUrls, entry.photos).length, 0)}`,
      `Certifications included: ${report.certifications.length}`,
    ];
    summaryItems.forEach((item) => {
      doc.text(item, margin, y);
      y += 7;
    });

    y += 4;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    for (const entry of report.entries) {
      const entryPhotos = parsePhotoUrls(entry.photoUrl, entry.photoUrls, entry.photos).slice(0, 3);
      const details = [
        entry.rooms && `Rooms: ${entry.rooms.join(', ')}`,
        entry.baitBoxesPlaced && `Bait Boxes: ${entry.baitBoxesPlaced}`,
        entry.poisonUsed && `Poison Used: ${entry.poisonUsed}`,
      ].filter(Boolean) as string[];
      const notesLines = entry.notes ? doc.splitTextToSize(`Notes: ${entry.notes}`, captionWidth) : [];
      const imageHeight = entryPhotos.length > 0 ? 36 : 0;
      const blockHeight = 18 + details.length * 7 + notesLines.length * 6 + imageHeight + 12;
      ensureSpace(blockHeight + 8);

      doc.setFillColor(249, 250, 253);
      doc.roundedRect(margin, y, contentWidth, blockHeight, 6, 6, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, blockHeight, 6, 6, 'S');

      let entryY = y + 10;
      doc.setFontSize(12);
      doc.setTextColor(17, 24, 39);
      doc.text(`${new Date(entry.date).toLocaleDateString()} · ${entry.clientName}`, margin + 6, entryY);
      entryY += 8;

      doc.setFontSize(10);
      doc.setTextColor(51, 65, 85);
      doc.text(`Address: ${entry.address}`, margin + 6, entryY);
      entryY += 7;
      doc.text(`Treatment: ${entry.treatment || 'N/A'}`, margin + 6, entryY);
      entryY += 8;

      details.forEach((detail) => {
        doc.text(detail, margin + 6, entryY);
        entryY += 6;
      });

      if (notesLines.length > 0) {
        entryY += 2;
        doc.setFontSize(10);
        doc.setTextColor(75, 85, 99);
        doc.text(notesLines, margin + 6, entryY);
        entryY += notesLines.length * 6;
      }

      if (entryPhotos.length > 0) {
        const imageTop = entryY + 6;
        const imageWidth = Math.min((contentWidth - 14 - (entryPhotos.length - 1) * 4) / entryPhotos.length, 60);
        let imageX = margin + 6;
        for (const photoUrl of entryPhotos) {
          try {
            const base64 = await fetchImageAsBase64(photoUrl);
            if (base64) {
              doc.addImage(base64, 'JPEG', imageX, imageTop, imageWidth, imageHeight);
            }
          } catch {
            doc.setFontSize(9);
            doc.setTextColor(148, 163, 184);
            doc.text('Photo unavailable', imageX, imageTop + 10);
          }
          imageX += imageWidth + 4;
        }
        entryY = imageTop + imageHeight + 6;
      }

      y += blockHeight + 8;
    }

    if (report.certifications.length > 0) {
      ensureSpace(36);
      doc.setFontSize(14);
      doc.setTextColor(17, 24, 39);
      doc.text('Certifications', margin, y);
      y += 10;
      doc.setFontSize(11);
      doc.setTextColor(75, 85, 99);

      report.certifications.forEach((cert) => {
        ensureSpace(24);
        const certName = cert.fileUrl.split('/').pop() || cert.fileUrl;
        const certLines = doc.splitTextToSize(`Uploaded: ${new Date(cert.uploadedAt).toLocaleDateString()} · Expiry: ${cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : 'No expiry'}`, captionWidth);
        doc.text(certLines, margin + 6, y);
        y += certLines.length * 6;
        const fileLines = doc.splitTextToSize(`File: ${certName}`, captionWidth);
        doc.text(fileLines, margin + 6, y);
        y += fileLines.length * 6 + 8;
      });
    }

    addFooter();
    doc.save(`pesttrace-report-${selectedTechnician}-${Date.now()}.pdf`);
    showToast('Report downloaded', 'Your printable A4 report has been generated successfully.', 'success');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-offwhite">Loading report tools...</div>;
  }

  return (
    <div className="min-h-screen bg-offwhite">
      <div className="flex">
        <Sidebar activeTab="reports" onSignOut={async () => {
          if (isPreviewMode) {
            router.push('/');
            return;
          }
          await supabase.auth.signOut();
          router.push('/auth/signin');
        }} />
        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-6xl space-y-6">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-navy">Compliance Reports</h1>
              <p className="text-sm text-gray-600">Generate owner-only reports for technician work and certifications.</p>
            </div>
          </div>
        </div>

        {upgradeConfirmedPlan ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900 shadow-sm">
            <p className="font-semibold">Your subscription has been upgraded to {upgradeConfirmedPlan}.</p>
            <p className="mt-1">Enhanced reporting and compliance tools are now available on this page.</p>
          </div>
        ) : null}

        {reportGeneratedMessage ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-100 p-5 text-sm text-slate-800 shadow-sm">
            <p className="font-semibold">Report ready</p>
            <p className="mt-1">{reportGeneratedMessage}</p>
          </div>
        ) : null}

        {updatedEntryMessage ? (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950 shadow-sm">
            <p className="font-semibold">Changes saved</p>
            <p className="mt-1">{updatedEntryMessage}</p>
          </div>
        ) : null}

        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-5">
            {!isOwner ? (
              <div className="form-group sm:col-span-1">
                <label className="form-label">Technician</label>
                <div className="form-input bg-slate-50 text-slate-700 px-3 py-2 rounded-xl">
                  {technicians[0]?.name || 'Loading...'}
                </div>
              </div>
            ) : (
              <div className="form-group sm:col-span-1">
                <label htmlFor="technician-select" className="form-label">Technician</label>
                <select
                  id="technician-select"
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  className="form-select"
                >
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label htmlFor="search" className="form-label">Search</label>
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Client or address..."
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="start-date" className="form-label">Start Date</label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="end-date" className="form-label">End Date</label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group flex flex-col justify-end">
              <button
                type="button"
                onClick={fetchReport}
                className="btn btn-primary hover-lift"
                disabled={fetching}
              >
                {fetching ? (
                  <>
                    <span className="spinner"></span>
                    <span>Fetching...</span>
                  </>
                ) : (
                  '📊 Fetch Report'
                )}
              </button>
            </div>
          </div>
        </div>

        {report && (
          <div className="bg-white rounded-xl shadow-md p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5 shadow-sm">
<div>
              <h2 className="text-2xl sm:text-3xl font-bold text-navy">{isOwner ? 'Company Report Results' : 'My Report Results'}</h2>
              <p className="mt-1 text-sm text-slate-600">Review your logged jobs by client name or address. Export as PDF for compliance.</p>
            </div>
              <button
                type="button"
                onClick={downloadPdf}
                className="btn btn-success hover-lift px-5 py-3"
              >
                📥 Download PDF
              </button>
            </div>

            {/* Report Summary */}
            <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4 sm:p-6">
              <div className="grid gap-2 sm:grid-cols-3 text-sm sm:text-base">
                <div>
                  <p className="text-gray-600">Company</p>
                  <p className="font-semibold text-navy">{report.companyName}</p>
                </div>
                <div>
                  <p className="text-gray-600">Technician</p>
                  <p className="font-semibold text-navy">{technicians.find((t) => t.id === selectedTechnician)?.name || ''}</p>
                </div>
                <div>
                  <p className="text-gray-600">Period</p>
                  <p className="font-semibold text-navy">{new Date(startDate).toLocaleDateString()} — {new Date(endDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Jobs</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{report.entries.length}</p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Photos</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{report.entries.reduce((count, entry) => count + parsePhotoUrls(entry.photoUrl, entry.photoUrls, entry.photos).length, 0)}</p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Certifications</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{report.certifications.length}</p>
                </div>
              </div>
            </div>

            {plan === 'business' || plan === 'enterprise' ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-navy">Business insights</h3>
                    <p className="text-sm text-slate-600">Advanced analytics, technician performance tracking, and route planning for your team.</p>
                  </div>
                  {analyticsLoading ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                      <span className="spinner" /> Loading analytics...
                    </span>
                  ) : null}
                </div>

                {analytics ? (
                  <div className="mt-6 space-y-6">
                    <div className="grid gap-4 sm:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Total jobs</p>
                        <p className="mt-2 text-2xl font-semibold text-navy">{analytics.totalJobs}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Completed</p>
                        <p className="mt-2 text-2xl font-semibold text-navy">{analytics.completedJobs}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Open jobs</p>
                        <p className="mt-2 text-2xl font-semibold text-navy">{analytics.openJobs}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Avg duration</p>
                        <p className="mt-2 text-2xl font-semibold text-navy">{analytics.averageDurationMinutes !== null ? `${analytics.averageDurationMinutes} min` : 'N/A'}</p>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h4 className="text-lg font-semibold text-navy">Route optimization</h4>
                        <p className="text-sm text-slate-600 mt-2">A recommended sequence for upcoming jobs based on schedule.</p>
                        {analytics.routePlan.length === 0 ? (
                          <p className="mt-4 text-sm text-slate-500">No route data available for this range.</p>
                        ) : (
                          <ol className="mt-4 space-y-3">
                            {analytics.routePlan.map((stop, index) => (
                              <li key={`${stop.address}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-sm font-semibold text-slate-900">Stop {index + 1}</span>
                                  <span className="text-xs uppercase text-slate-500">{stop.scheduledAt}</span>
                                </div>
                                <p className="mt-2 text-base font-semibold text-navy">{stop.clientName}</p>
                                <p className="text-sm text-slate-600">{stop.address}</p>
                                <p className="mt-1 text-sm text-slate-500">{stop.treatment}</p>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h4 className="text-lg font-semibold text-navy">Technician performance</h4>
                        <p className="text-sm text-slate-600 mt-2">Team productivity based on completed work and job duration.</p>
                        <div className="mt-4 grid gap-3">
                          {analytics.technicianPerformance.slice(0, 4).map((tech) => (
                            <div key={tech.technicianName} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                              <p className="text-sm font-semibold text-slate-900">{tech.technicianName}</p>
                              <p className="text-xs text-slate-500">Jobs: {tech.jobs}</p>
                              <p className="text-xs text-slate-500">Avg duration: {tech.averageDurationMinutes !== null ? `${tech.averageDurationMinutes} min` : 'N/A'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-sm">
                      <h4 className="text-lg font-semibold text-navy">Security & compliance pulse</h4>
                      <div className="mt-3 grid gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Missing photos</p>
                          <p className="mt-2 text-xl font-semibold text-navy">{analytics.auditSummary.missingPhotos}</p>
                        </div>
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Missing signatures</p>
                          <p className="mt-2 text-xl font-semibold text-navy">{analytics.auditSummary.missingSignatures}</p>
                        </div>
                        <div className="rounded-2xl bg-white p-4">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Open jobs</p>
                          <p className="mt-2 text-xl font-semibold text-navy">{analytics.auditSummary.missingStatus}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                    Business analytics will appear after you fetch the report.
                  </div>
                )}
              </div>
            ) : (
              <Card className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-navy">Upgrade to Business</h3>
                    <p className="text-sm text-slate-600">Unlock advanced reporting, route optimization, and technician performance tracking.</p>
                  </div>
                  <button type="button" onClick={() => router.push('/upgrade')} className="btn btn-primary">
                    Upgrade to Business
                  </button>
                </div>
              </Card>
            )}

            {/* Jobs Section */}
            <div className="space-y-4">
              <h3 className="text-xl sm:text-2xl font-bold text-navy">📋 Jobs ({report.entries.length})</h3>
              {report.entries.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center text-gray-500">
                  No jobs found for this range.
                </div>
              ) : (
                <div className="space-y-3">
                  {report.entries.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover-lift transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-navy">{entry.clientName}</h4>
                          <p className="text-sm text-gray-600">{entry.address}</p>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">{new Date(entry.date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 whitespace-nowrap">{entry.treatment}</span>
                          <button
                            type="button"
                            onClick={() => startEditingEntry(entry)}
                            className="btn btn-secondary btn-sm"
                          >
                            {editingEntryId === entry.id ? 'Editing' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteReportEntry(entry.id)}
                            disabled={deletingEntryId === entry.id}
                            className="btn btn-danger btn-sm"
                          >
                            {deletingEntryId === entry.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-gray-600">
                        {entry.rooms && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Rooms</p>
                            <p className="mt-1 font-semibold text-slate-900">{formatRoomSummary(entry.rooms) || 'No rooms added'}</p>
                          </div>
                        )}
                        {entry.baitBoxesPlaced && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Bait Boxes</p>
                            <p className="mt-1 font-semibold text-slate-900">{entry.baitBoxesPlaced}</p>
                          </div>
                        )}
                        {entry.poisonUsed && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Poison Used</p>
                            <p className="mt-1 font-semibold text-slate-900">{entry.poisonUsed}</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-gray-600">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Notes</p>
                          <p className="mt-1 font-semibold text-slate-900">{entry.notes ? entry.notes.slice(0, 90) : 'No additional notes'}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Photos</p>
                          <p className="mt-1 font-semibold text-slate-900">{parsePhotoUrls(entry.photoUrl, entry.photoUrls, entry.photos).length}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Signature</p>
                          <p className="mt-1 font-semibold text-slate-900">{entry.signature ? 'Captured' : 'Not captured'}</p>
                        </div>
                      </div>
                      {entry.notes ? (
                        <p className="mt-4 text-gray-600 text-sm leading-6">{entry.notes}</p>
                      ) : null}
                      {editingEntryId === entry.id && editingEntryState ? (
                        <div className="mt-6 rounded-2xl border border-primary-200 bg-primary-50 p-4">
                          <div className="flex items-center justify-between gap-4">
                            <h5 className="text-base font-semibold text-primary-900">Edit report entry</h5>
                            <button type="button" onClick={() => { setEditingEntryId(null); setEditingEntryState(null); }} className="text-sm text-primary-700 hover:text-primary-900">Cancel</button>
                          </div>
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <FormInput label="Client Name" id={`edit-client-${entry.id}`} value={editingEntryState.clientName} onChange={(e) => setEditingEntryState({ ...editingEntryState, clientName: e.target.value })} />
                            <FormInput label="Address" id={`edit-address-${entry.id}`} value={editingEntryState.address} onChange={(e) => setEditingEntryState({ ...editingEntryState, address: e.target.value })} />
                            <FormInput label="Treatment" id={`edit-treatment-${entry.id}`} value={editingEntryState.treatment} onChange={(e) => setEditingEntryState({ ...editingEntryState, treatment: e.target.value })} />
                            <FormInput label="Date" id={`edit-date-${entry.id}`} type="date" value={editingEntryState.date} onChange={(e) => setEditingEntryState({ ...editingEntryState, date: e.target.value })} />
                          </div>
                          <div className="mt-4 grid gap-4">
                            <FormInput label="Job Notes" id={`edit-notes-${entry.id}`} as="textarea" value={editingEntryState.notes} onChange={(e) => setEditingEntryState({ ...editingEntryState, notes: e.target.value })} />
                          </div>
                          <div className="mt-4">
                            <div className="flex items-center justify-between gap-4 mb-3">
                              <p className="font-semibold text-slate-900">Room details</p>
                              <button type="button" onClick={addEditingRoom} className="text-sm text-primary-700 hover:text-primary-900">+ Add Room</button>
                            </div>
                            <div className="space-y-3">
                              {editingEntryState.rooms.map((room, roomIndex) => (
                                <div key={`edit-room-${roomIndex}`} className="rounded-2xl border border-slate-200 bg-white p-3 max-w-3xl">
                                  <FormInput label="Room Name" id={`edit-room-name-${entry.id}-${roomIndex}`} value={room.name} onChange={(e) => updateEditingRoom(roomIndex, 'name', e.target.value)} placeholder="Kitchen" />
                                  <FormInput label="Room Notes" id={`edit-room-note-${entry.id}-${roomIndex}`} as="textarea" value={room.note} onChange={(e) => updateEditingRoom(roomIndex, 'note', e.target.value)} placeholder="Treatment details for this room" />
                                  <button type="button" onClick={() => removeEditingRoom(roomIndex)} className="mt-2 text-sm text-red-600 hover:text-red-800">Remove room</button>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <button type="button" onClick={saveEditedEntry} disabled={savingEdit} className="btn btn-primary btn-sm">
                              {savingEdit ? 'Saving...' : 'Save changes'}
                            </button>
                            <button type="button" onClick={() => { setEditingEntryId(null); setEditingEntryState(null); }} className="btn btn-secondary btn-sm">
                              Close
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {parsePhotoUrls(entry.photoUrl, entry.photoUrls, entry.photos).length > 0 ? (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-semibold text-gray-800">Job photos</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {parsePhotoUrls(entry.photoUrl, entry.photoUrls, entry.photos).map((url) => (
                              <div key={url} className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
<Image
                                  loader={supabaseImageLoader}
                                  src={url}
                                  alt={`Job photo for ${entry.clientName}`}
                                  width={800}
                                  height={400}
                                  className="w-full h-auto max-h-[400px] object-contain rounded-2xl shadow-sm hover:shadow-md transition-shadow"
                                  sizes="(max-width: 640px) 100vw, 50vw"
                                  unoptimized
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {entry.signature ? (
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
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Certifications Section */}
            <div className="space-y-4">
              <h3 className="text-xl sm:text-2xl font-bold text-navy">📜 Certifications ({report.certifications.length})</h3>
              {report.certifications.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-300 p-8 text-center text-gray-500">
                  No certifications available for this technician.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {report.certifications.map((cert) => (
                    <div key={cert.id} className="rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover-lift transition-shadow">
                      <p className="text-sm text-gray-600">Uploaded</p>
                      <p className="font-semibold text-gray-900">{new Date(cert.uploadedAt).toLocaleDateString()}</p>
                      <p className="mt-3 text-sm text-gray-600">Expiry</p>
                      <p className="font-semibold text-gray-900">{cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : 'No expiry'}</p>
                      <a href={buildCertDownloadUrl(cert.fileUrl)} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm">
                        📥 Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  );
}
