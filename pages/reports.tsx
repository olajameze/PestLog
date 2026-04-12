
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Sidebar from '../components/sidebar';
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
  rooms?: string[];
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    const loadOwnerData = async () => {
      if (isPreviewMode) {
        const mockTechs = [
          { id: 'tech-1', name: 'John Smith', email: 'john@preview.local' },
          { id: 'tech-2', name: 'Sarah Johnson', email: 'sarah@preview.local' },
          { id: 'tech-3', name: 'Mike Williams', email: 'mike@preview.local' },
        ];
        setCompany({ id: 'preview-company', name: 'PestTrek Preview Co.', email: 'owner@preview.local' });
        setTechnicians(mockTechs);
        setSelectedTechnician(mockTechs[0].id);
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/signin');
        return;
      }

      const companyRes = await fetch('/api/company', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!companyRes.ok) {
        router.push('/dashboard');
        return;
      }

      const companyData = await companyRes.json();
      if (!companyData) {
        router.push('/dashboard');
        return;
      }

      setCompany(companyData);

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

      const techRes = await fetch('/api/technicians', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const techData = await techRes.json();
      setTechnicians(techData);
      setSelectedTechnician(techData[0]?.id ?? '');
      setLoading(false);
    };

    loadOwnerData();
  }, [isPreviewMode, router]);

    const [search, setSearch] = useState('');

    const fetchReport = async () => {
      if (!selectedTechnician || !startDate || !endDate) {
        showToast('Missing filters', 'Select a technician and date range first.', 'error');
        return;
      }

      setFetching(true);
      let apiUrl = `/api/reports?technicianId=${selectedTechnician}&startDate=${startDate}&endDate=${endDate}`;
      if (search.trim()) {
        apiUrl += `&search=${encodeURIComponent(search.trim())}`;
      }

      if (isPreviewMode) {
      const selectedName = technicians.find((t) => t.id === selectedTechnician)?.name || 'Technician';
      setReport({
        companyName: company?.name || 'PestTrek Preview Co.',
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
      });
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
    setFetching(false);
  };

  const downloadPdf = async () => {
    if (!report || !company) return;
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });

    const pageWidth = 612;
    const contentWidth = 532;
    const marginLeft = 40;
    const marginRight = pageWidth - marginLeft;
    const lineHeight = 16;
    let y = 50;

    const addHeader = () => {
      doc.setFillColor(19, 78, 203);
      doc.rect(0, 0, pageWidth, 50, 'F');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text(`${company.name || company.email}`, marginLeft, 32);
      doc.setFontSize(10);
      doc.text('Compliance Report', marginLeft, 46);
      doc.setTextColor(255, 255, 255);
      doc.text(`Technician: ${technicians.find((t) => t.id === selectedTechnician)?.name || ''}`, marginLeft + 260, 32);
      doc.text(`Period: ${new Date(startDate).toLocaleDateString()} — ${new Date(endDate).toLocaleDateString()}`, marginLeft + 260, 46);
      doc.setDrawColor(226, 232, 240);
      doc.line(marginLeft, 60, marginRight, 60);
      y = 75;
    };

    const addFooter = () => {
      const pageCount = doc.getNumberOfPages();
      for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
        doc.setPage(pageIndex);
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, marginLeft, 760);
        doc.text(`Page ${pageIndex} of ${pageCount}`, pageWidth - marginLeft - 80, 760);
      }
    };

    const ensureSpace = (needed: number) => {
      if (y + needed > 740) {
        doc.addPage();
        addHeader();
      }
    };

    addHeader();

    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text('Job Summary', marginLeft, y);
    y += 22;

    for (const entry of report.entries) {
      ensureSpace(140);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(marginLeft, y, contentWidth, 110, 8, 8, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(marginLeft, y, contentWidth, 110, 8, 8, 'S');
      y += 16;

      doc.setFontSize(11);
      doc.setTextColor(17, 24, 39);
      doc.text(`${new Date(entry.date).toLocaleDateString()} · ${entry.clientName}`, marginLeft + 8, y);
      y += lineHeight;
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.text(`Address: ${entry.address}`, marginLeft + 8, y);
      y += lineHeight;
      doc.text(`Treatment: ${entry.treatment}`, marginLeft + 8, y);
      y += lineHeight;

      const details = [
        entry.rooms && `Rooms: ${entry.rooms.join(', ')}`,
        entry.baitBoxesPlaced && `Bait Boxes: ${entry.baitBoxesPlaced}`,
        entry.poisonUsed && `Poison Used: ${entry.poisonUsed}`,
      ].filter(Boolean) as string[];
      details.forEach((detail) => {
        doc.text(detail, marginLeft + 8, y);
        y += lineHeight;
      });

      if (entry.notes) {
        const notesLines = doc.splitTextToSize(`Notes: ${entry.notes}`, contentWidth - 16);
        doc.text(notesLines, marginLeft + 8, y);
        y += notesLines.length * lineHeight;
      }

      const entryPhotos = parsePhotoUrls(entry.photoUrl, entry.photoUrls, entry.photos);
      if (entryPhotos.length > 0) {
        ensureSpace(90);
        const imageTop = y + 4;
        let imageX = marginLeft + 8;
        const imageWidth = 120;
        const imageHeight = 80;

        for (const photoUrl of entryPhotos.slice(0, 3)) {
          if (imageX + imageWidth > marginLeft + contentWidth) {
            imageX = marginLeft + 8;
          }
          try {
            const base64 = await fetchImageAsBase64(photoUrl);
            if (base64) {
              doc.addImage(base64, 'JPEG', imageX, imageTop, imageWidth, imageHeight);
            }
          } catch {
            // Ignore image failures
          }
          imageX += imageWidth + 10;
        }
        y += imageHeight + 16;
      } else {
        y += 12;
      }

      if (entry.signature) {
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('Signature captured', marginLeft + 8, y);
        y += lineHeight;
      }
      y += 10;
    }

    if (report.certifications.length > 0) {
      ensureSpace(80);
      doc.setFontSize(12);
      doc.setTextColor(17, 24, 39);
      doc.text('Certifications', marginLeft, y);
      y += 18;

      report.certifications.forEach((cert) => {
        ensureSpace(60);
        doc.setFontSize(10);
        doc.setTextColor(75, 85, 99);
        doc.text(`Uploaded: ${new Date(cert.uploadedAt).toLocaleDateString()}`, marginLeft, y);
        y += lineHeight;
        doc.text(`Expiry: ${cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : 'No expiry'}`, marginLeft, y);
        y += lineHeight;
        doc.text(`File: ${cert.fileUrl}`, marginLeft, y);
        y += 20;
      });
    }

    addFooter();
    doc.save(`pesttrek-report-${selectedTechnician}-${Date.now()}.pdf`);
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

        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-5">
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
                <h2 className="text-2xl sm:text-3xl font-bold text-navy">Report Results</h2>
                <p className="mt-1 text-sm text-slate-600">Review the summary data before exporting the report as a PDF.</p>
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
                        <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 whitespace-nowrap">{entry.treatment}</span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-gray-600">
                        {entry.rooms && (
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Rooms</p>
                            <p className="mt-1 font-semibold text-slate-900">{entry.rooms.join(', ')}</p>
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
                      {parsePhotoUrls(entry.photoUrl, entry.photoUrls, entry.photos).length > 0 ? (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm font-semibold text-gray-800">Job photos</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            {parsePhotoUrls(entry.photoUrl, entry.photoUrls, entry.photos).map((url) => (
                              <div key={url} className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                                <Image
                                  src={url}
                                  alt={`Job photo for ${entry.clientName}`}
                                  width={800}
                                  height={400}
                                  className="h-40 w-full object-cover"
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
                      <a href={cert.fileUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm">
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
