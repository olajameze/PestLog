import type { PrismaClient } from '@prisma/client';
import type {
  DashboardData,
  DashboardDateRangeOption,
} from './api/mockDashboardData';

type CompanyPolicy = {
  requirePhotos: boolean;
  requireSignature: boolean;
};

const ESTIMATED_GBP_PER_VISIT = 135;

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function rangeToDays(range: DashboardDateRangeOption): number {
  if (range === '7') return 7;
  if (range === '30') return 30;
  return 90;
}

function normalizeClientKey(name: string): string {
  return name.trim().toLowerCase();
}

function hashStringToPercent(s: string, axis: 0 | 1): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const base = axis === 0 ? h % 85 : (h >> 8) % 75;
  return 10 + base;
}

function entryHasPhoto(entry: { photoUrl: string | null; photos: { url: string }[] }): boolean {
  return Boolean(entry.photoUrl) || entry.photos.length > 0;
}

function entryHasSignature(entry: { signature: string | null }): boolean {
  return Boolean(entry.signature && entry.signature.trim().length > 0);
}

function isEntryCompliant(entry: { status: string | null; photoUrl: string | null; photos: { url: string }[]; signature: string | null }, policy: CompanyPolicy): boolean {
  const status = entry.status?.trim().toLowerCase() || 'open';
  const completed = status !== 'open';
  const photoOk = !policy.requirePhotos || entryHasPhoto(entry);
  const sigOk = !policy.requireSignature || entryHasSignature(entry);
  return completed && photoOk && sigOk;
}

function parseVolumeMl(productAmount: string | null): number {
  if (!productAmount) return 0;
  const m = productAmount.match(/(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  return Math.round(Number(m[1]));
}

function parsePoisonLabel(poisonUsed: string | null, treatment: string): string {
  const p = poisonUsed?.trim();
  if (p && p.toLowerCase() !== 'no' && p.length > 0) return p;
  return treatment.trim() || 'Treatment logged';
}

export async function buildDashboardInsights(
  prisma: PrismaClient,
  companyId: string,
  policy: CompanyPolicy,
  range: DashboardDateRangeOption,
): Promise<DashboardData> {
  const days = rangeToDays(range);
  const now = new Date();
  const rangeEnd = endOfLocalDay(now);
  const rangeStart = new Date(rangeEnd);
  rangeStart.setDate(rangeStart.getDate() - (days - 1));
  rangeStart.setHours(0, 0, 0, 0);

  const todayStart = startOfLocalDay(now);
  const todayEnd = endOfLocalDay(now);

  const [entriesInRange, entriesToday, technicians] = await Promise.all([
    prisma.logbookEntry.findMany({
      where: { companyId, date: { gte: rangeStart, lte: rangeEnd } },
      include: {
        photos: { select: { url: true } },
        logbookEntryTechnicians: { include: { technician: { select: { name: true } } } },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.logbookEntry.findMany({
      where: { companyId, date: { gte: todayStart, lte: todayEnd } },
      include: {
        photos: { select: { url: true } },
        logbookEntryTechnicians: { include: { technician: { select: { name: true } } } },
      },
      orderBy: [{ startTime: 'asc' }, { date: 'asc' }],
    }),
    prisma.technician.findMany({
      where: { companyId },
      include: {
        certifications: { select: { id: true, expiryDate: true } },
      },
    }),
  ]);

  const certs = technicians.flatMap((t) =>
    t.certifications.map((c) => ({
      id: c.id,
      expiryDate: c.expiryDate,
      technicianName: t.name,
    })),
  );

  // Helper to safely get status (never null)
function getStatus(entry: { status: string | null }): string {
  return entry.status?.trim()?.toLowerCase() || 'open';
}

const appointments = entriesToday.map((e) => {
  const techNames = e.logbookEntryTechnicians.map((x) => x.technician.name).join(', ') || 'Unassigned';
  const t = e.startTime ?? e.date;
  const time = t ? t.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'N/A';
  const statusLower = getStatus(e);
  const completed = statusLower !== 'open';
  const lat = 51.45 + (hashStringToPercent(e.address, 0) / 5000);
  const lng = -2.58 - (hashStringToPercent(e.address, 1) / 5000);
  return {
    id: e.id,
    clientName: e.clientName,
    address: e.address,
    time,
    status: completed ? ('completed' as const) : ('pending' as const),
    technician: techNames,
    locationLabel: e.address.slice(0, 32) + (e.address.length > 32 ? '…' : ''),
    lat,
    lng,
  };
});

const completedToday = appointments.filter((a) => a.status === 'completed').length;
const scheduledToday = appointments.length;
const percentComplete = scheduledToday === 0 ? 0 : Math.round((completedToday / scheduledToday) * 100);

const locations = entriesToday.slice(0, 8).map((e, index) => {
  const statusLower = getStatus(e);
  const completed = statusLower !== 'open';
  const key = `${e.address}-${index}`;
  return {
    label: e.clientName,
    status: completed ? ('completed' as const) : ('pending' as const),
    xPercent: hashStringToPercent(key, 0),
    yPercent: hashStringToPercent(key, 1),
  };
});

const bucketCount = Math.min(12, Math.max(4, Math.ceil(days / 7)));
const bucketMs = (rangeEnd.getTime() - rangeStart.getTime() + 1) / bucketCount;
const series: { date: string; rate: number }[] = [];
for (let b = 0; b < bucketCount; b += 1) {
  const from = new Date(rangeStart.getTime() + b * bucketMs);
  const to = new Date(rangeStart.getTime() + (b + 1) * bucketMs - 1);
  const slice = entriesInRange.filter((e) => e.date >= from && e.date <= to);
  const rate =
    slice.length === 0
      ? 0
      : Math.round(
          (slice.filter((e) => isEntryCompliant(e, policy)).length / slice.length) * 100,
        );
  series.push({
    date: `${from.getDate()}/${from.getMonth() + 1}`,
    rate,
  });
}

const currentRate =
  entriesInRange.length === 0
    ? 0
    : Math.round(
        (entriesInRange.filter((e) => isEntryCompliant(e, policy)).length / entriesInRange.length) *
          100,
      );

const openActions = entriesInRange
  .filter((e) => !isEntryCompliant(e, policy))
  .slice(0, 5)
  .map((e) => {
    const statusLower = getStatus(e);
    return {
      id: e.id,
      title: statusLower === 'open' ? 'Job still open' : 'Compliance gap on closed job',
      area: e.clientName,
      dueDate: e.followUpDate ? e.followUpDate.toLocaleDateString() : 'Review',
    };
  });

const chemicalMap = new Map<string, { volume: number; compliant: number; total: number }>();
for (const e of entriesInRange) {
  const label = parsePoisonLabel(e.poisonUsed, e.treatment);
  const vol = parseVolumeMl(e.productAmount) || 120;
  const row = chemicalMap.get(label) ?? { volume: 0, compliant: 0, total: 0 };
  row.volume += vol;
  row.total += 1;
  const statusLower = getStatus(e);
  if (statusLower !== 'open') row.compliant += 1;
  chemicalMap.set(label, row);
}

const chemicalLog = [...chemicalMap.entries()]
  .sort((a, b) => b[1].volume - a[1].volume)
  .slice(0, 6)
  .map(([chemical, agg], i) => ({
    id: `chem-${i}-${chemical}`,
    chemical,
    volumeMl: agg.volume,
    status: (agg.compliant / agg.total >= 0.85 ? 'compliant' : 'non-compliant') as 'compliant' | 'non-compliant',
    stockRemaining: Math.max(8, Math.min(92, 100 - (agg.volume % 60))),
  }));

const urgentAlerts: DashboardData['urgentAlerts'] = [];
const soon = new Date();
soon.setDate(soon.getDate() + 30);
for (const c of certs) {
  if (!c.expiryDate) continue;
  if (c.expiryDate <= soon && c.expiryDate >= now) {
    urgentAlerts.push({
      id: `cert-${c.id}`,
      title: `Certification expiring: ${c.technicianName}`,
      description: `Expires ${c.expiryDate.toLocaleDateString()}. Renew before work is blocked on audits.`,
      severity: c.expiryDate.getTime() - now.getTime() < 7 * 86400000 ? 'high' : 'medium',
    });
  }
}

for (const e of entriesInRange) {
  if (e.followUpDate && e.followUpDate < now && getStatus(e) === 'open') {
    urgentAlerts.push({
      id: `fu-${e.id}`,
      title: `Follow-up overdue: ${e.clientName}`,
      description: `Follow-up was due ${e.followUpDate.toLocaleDateString()}. Job is still open.`,
      severity: 'high',
    });
  }
}

if (policy.requirePhotos) {
  const recent = entriesInRange.filter((e) => (now.getTime() - e.date.getTime()) / 86400000 <= 14);
  for (const e of recent) {
    if (!entryHasPhoto(e)) {
      urgentAlerts.push({
        id: `photo-${e.id}`,
        title: 'Job missing photos',
        description: `${e.clientName} (${e.date.toLocaleDateString()}) has no photos attached.`,
        severity: 'medium',
      });
    }
  }
}

const clientCounts = new Map<string, number>();
for (const e of entriesInRange) {
  const k = normalizeClientKey(e.clientName);
  if (!k) continue;
  clientCounts.set(k, (clientCounts.get(k) ?? 0) + 1);
}
const uniqueClients = clientCounts.size;
const totalJobs = entriesInRange.length;
const repeatClients = [...clientCounts.values()].filter((n) => n >= 2).length;
const retentionRate =
  uniqueClients === 0 ? 0 : Math.round((repeatClients / uniqueClients) * 100);

const openByTreatment = new Map<string, number>();
for (const e of entriesInRange) {
  if (getStatus(e) === 'open') {
    const t = e.treatment.trim() || 'General';
    openByTreatment.set(t, (openByTreatment.get(t) ?? 0) + 1);
  }
}
  const reasons = [...openByTreatment.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([reason, count]) => ({ reason: `Open jobs: ${reason}`, count }));

  const avgJobsPerClient = uniqueClients === 0 ? 0 : totalJobs / uniqueClients;
  // Calculate average price per job from actual data, fallback to estimated value
  const totalRevenue = entriesInRange.reduce((sum, entry) => sum + (entry.price ? Number(entry.price) : ESTIMATED_GBP_PER_VISIT), 0);
  const avgPricePerJob = entriesInRange.length > 0 ? totalRevenue / entriesInRange.length : ESTIMATED_GBP_PER_VISIT;
  const clv = Math.round(avgJobsPerClient * avgPricePerJob * Math.max(1, uniqueClients));
  const cac = Math.max(420, Math.min(1400, Math.round(5400 / Math.max(1, Math.ceil(uniqueClients / 2) || 1))));

  const weekBuckets = Math.min(8, Math.max(3, Math.ceil(days / 14)));
  const trend: number[] = [];
  for (let w = 0; w < weekBuckets; w += 1) {
    const from = new Date(rangeStart.getTime() + (w * (rangeEnd.getTime() - rangeStart.getTime())) / weekBuckets);
    const to = new Date(
      rangeStart.getTime() + ((w + 1) * (rangeEnd.getTime() - rangeStart.getTime())) / weekBuckets,
    );
    const slice = entriesInRange.filter((e) => e.date >= from && e.date < to);
    const sliceRevenue = slice.reduce((sum, entry) => sum + (entry.price ? Number(entry.price) : ESTIMATED_GBP_PER_VISIT), 0);
    trend.push(Math.round(sliceRevenue));
  }
  if (trend.length === 0) trend.push(0);

  const csatTrend: number[] = [];
  for (let w = 0; w < weekBuckets; w += 1) {
    const from = new Date(rangeStart.getTime() + (w * (rangeEnd.getTime() - rangeStart.getTime())) / weekBuckets);
    const to = new Date(
      rangeStart.getTime() + ((w + 1) * (rangeEnd.getTime() - rangeStart.getTime())) / weekBuckets,
    );
    const slice = entriesInRange.filter((e) => e.date >= from && e.date < to);
    if (slice.length === 0) {
      csatTrend.push(0);
      continue;
    }
    let acc = 0;
    for (const e of slice) {
      let pts = 0;
      if (!policy.requirePhotos || entryHasPhoto(e)) pts += 1;
      if (!policy.requireSignature || entryHasSignature(e)) pts += 1;
      if (e.notes && e.notes.trim().length > 10) pts += 0.5;
      acc += (pts / 2.5) * 5;
    }
    csatTrend.push(Math.round((acc / slice.length) * 10) / 10);
  }
  const averageCsat =
    csatTrend.length === 0 ? 0 : Math.round((csatTrend.reduce((a, b) => a + b, 0) / csatTrend.length) * 10) / 10;
  const nps = Math.max(-100, Math.min(100, Math.round((retentionRate - 55) * 1.8)));

  return {
    todaySchedule: {
      appointments,
      completed: completedToday,
      scheduled: scheduledToday,
      percentComplete,
      locations,
    },
    compliance: {
      series,
      openActions,
      currentRate,
    },
    chemicalLog,
    urgentAlerts: urgentAlerts.slice(0, 8),
    customerValue: {
      clv: uniqueClients === 0 ? 0 : clv,
      cac,
      trend,
    },
    retention: {
      retentionRate,
      reasons,
    },
    csat: {
      average: averageCsat,
      nps,
      trend: csatTrend,
    },
  };
}
