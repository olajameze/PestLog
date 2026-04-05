import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

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
  signature?: string;
};

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
  }, [router]);

  const fetchReport = async () => {
    if (!selectedTechnician || !startDate || !endDate) {
      alert('Select a technician and date range first.');
      return;
    }

    setFetching(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `/api/reports?technicianId=${selectedTechnician}&startDate=${startDate}&endDate=${endDate}`,
      {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      }
    );

    if (!res.ok) {
      const error = await res.json();
      alert(error.error || 'Failed to load report');
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

    doc.setFontSize(18);
    doc.text(`${company.name || company.email} Compliance Report`, 40, 50);
    doc.setFontSize(12);
    doc.text(`Technician: ${technicians.find((t) => t.id === selectedTechnician)?.name || ''}`, 40, 75);
    doc.text(`Date range: ${new Date(startDate).toLocaleDateString()} — ${new Date(endDate).toLocaleDateString()}`, 40, 92);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 40, 110);

    let y = 140;
    doc.setFontSize(14);
    doc.text('Jobs', 40, y);
    y += 20;
    report.entries.forEach((entry, index) => {
      const line = `${new Date(entry.date).toLocaleDateString()} | ${entry.clientName} | ${entry.treatment}`;
      doc.setFontSize(12);
      doc.text(line, 40, y);
      y += 16;
      doc.text(`Address: ${entry.address}`, 50, y);
      y += 16;
      if (entry.notes) {
        doc.text(`Notes: ${entry.notes}`, 50, y);
        y += 16;
      }
      if (entry.signature) {
        doc.text(`Signature: ${entry.signature.slice(0, 120)}`, 50, y);
        y += 16;
      }
      y += 10;
      if (y > 720) {
        doc.addPage();
        y = 50;
      }
    });

    if (report.certifications.length > 0) {
      doc.addPage();
      y = 50;
      doc.setFontSize(14);
      doc.text('Certifications', 40, y);
      y += 24;
      report.certifications.forEach((cert) => {
        doc.setFontSize(12);
        doc.text(`Uploaded: ${new Date(cert.uploadedAt).toLocaleDateString()}`, 40, y);
        y += 16;
        doc.text(`Expiry: ${cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : 'N/A'}`, 40, y);
        y += 16;
        doc.text(`File URL: ${cert.fileUrl}`, 40, y);
        y += 24;
        if (y > 720) {
          doc.addPage();
          y = 50;
        }
      });
    }

    doc.save(`pestlog-report-${selectedTechnician}-${Date.now()}.pdf`);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-offwhite">Loading report tools...</div>;
  }

  return (
    <div className="min-h-screen bg-offwhite px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-navy">Compliance Reports</h1>
              <p className="text-sm text-gray-600">Generate owner-only reports for technician work and certifications.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6">
          <div className="grid gap-4 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <label htmlFor="technician-select" className="block text-sm font-medium text-gray-700">Technician</label>
              <select
                id="technician-select"
                value={selectedTechnician}
                onChange={(e) => setSelectedTechnician(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-2xl px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {technicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>{tech.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-2xl px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-2xl px-4 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchReport}
                className="w-full rounded-2xl bg-blue-600 px-6 py-3 text-white text-sm font-semibold hover:bg-blue-700 hover-lift disabled:opacity-50"
                disabled={fetching}
              >
                {fetching ? <span className="inline-flex items-center gap-2"><span className="spinner"></span>Fetching...</span> : 'Fetch Report'}
              </button>
            </div>
          </div>
        </div>

        {report && (
          <div className="bg-white rounded-2xl shadow-md p-6 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-semibold text-navy">Report Results</h2>
              <button
                onClick={downloadPdf}
                className="rounded-2xl bg-green-600 px-6 py-3 text-white text-sm font-semibold hover:bg-green-700"
              >
                Download PDF
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                <p><span className="font-semibold">Company:</span> {report.companyName}</p>
                <p><span className="font-semibold">Technician:</span> {technicians.find((t) => t.id === selectedTechnician)?.name || ''}</p>
                <p><span className="font-semibold">Period:</span> {new Date(startDate).toLocaleDateString()} — {new Date(endDate).toLocaleDateString()}</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-navy">Jobs</h3>
                {report.entries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-500">No jobs found for this range.</div>
                ) : (
                  <div className="space-y-4">
                    {report.entries.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-gray-200 p-5 shadow-sm hover-lift">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h4 className="text-lg font-semibold text-navy">{entry.clientName}</h4>
                            <p className="text-sm text-gray-500">{new Date(entry.date).toLocaleDateString()}</p>
                          </div>
                          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">{entry.treatment}</span>
                        </div>
                        <p className="mt-3 text-gray-700">{entry.address}</p>
                        {entry.notes && <p className="mt-2 text-gray-600">Notes: {entry.notes}</p>}
                        {entry.signature && <p className="mt-2 text-gray-600">Signature: {entry.signature}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-navy">Certifications</h3>
                {report.certifications.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-500">No certifications available for this technician.</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {report.certifications.map((cert) => (
                      <div key={cert.id} className="rounded-2xl border border-gray-200 p-5 shadow-sm hover-lift">
                        <p className="text-sm text-gray-700">Uploaded: {new Date(cert.uploadedAt).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-700">Expiry: {cert.expiryDate ? new Date(cert.expiryDate).toLocaleDateString() : 'N/A'}</p>
                        <a href={cert.fileUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-blue-600 hover:text-blue-800">Download certification</a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
