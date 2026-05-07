import { jsPDF } from 'jspdf';

export type IntelligenceSummaryForPdf = {
  total: number;
  byPestType: { name: string; count: number }[];
  byOutcome: { name: string; count: number }[];
  bySeverity: { name: string; count: number }[];
  byProperty: { name: string; count: number }[];
  postcodeRankings: { area: string; count: number }[];
  postcodeRedactedNote: string | null;
  dayTrend: { day: string; count: number }[];
  monthTrend: { month: string; count: number }[];
  executive: { periodEvents: number; topPest: string | null; topPestShare: number | null };
};

const PRIMARY = { r: 47, g: 133, b: 90 };
const ACCENT = { r: 229, g: 62, b: 62 };
const BLUE = { r: 49, g: 130, b: 206 };
const FG = { r: 30, g: 41, b: 59 };
const MUTED = { r: 100, g: 116, b: 139 };
const BORDER = { r: 228, g: 228, b: 231 };

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const HEADER_BAND = 28;

export async function loadPublicAssetAsDataUrl(path: string): Promise<string | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function shortMonthLabel(isoMonth: string): string {
  const [y, m] = isoMonth.split('-');
  const mi = parseInt(m, 10);
  if (!y || !mi || mi < 1 || mi > 12) return isoMonth;
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[mi - 1]} '${y.slice(2)}`;
}

function dayLabelShort(isoDay: string): string {
  return isoDay.length >= 10 ? isoDay.slice(5) : isoDay;
}

function truncateText(_doc: jsPDF, text: string, maxChars: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars - 1)}…`;
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number): void {
  doc.setFontSize(7);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(
    `PestTrace Intelligence · Confidential · Super-admin export · Page ${pageNum} of ${totalPages}`,
    PAGE_W / 2,
    PAGE_H - 8,
    { align: 'center' },
  );
  doc.setTextColor(0, 0, 0);
}

function drawPageHeader(
  doc: jsPDF,
  logoDataUrl: string | null,
  dateFrom: string,
  dateTo: string,
  isFirstPage: boolean,
): void {
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, PAGE_W, HEADER_BAND, 'F');
  doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
  doc.setLineWidth(0.25);
  doc.line(0, HEADER_BAND, PAGE_W, HEADER_BAND);

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', MARGIN, 6, 16, 16);
    } catch {
      // ignore corrupt image
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isFirstPage ? 15 : 12);
  doc.setTextColor(FG.r, FG.g, FG.b);
  doc.text('PestTrace Intelligence', MARGIN + (logoDataUrl ? 20 : 0), isFirstPage ? 13 : 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(`Reporting period: ${dateFrom} → ${dateTo}`, MARGIN + (logoDataUrl ? 20 : 0), isFirstPage ? 21 : 19);

  doc.setDrawColor(PRIMARY.r, PRIMARY.g, PRIMARY.b);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, HEADER_BAND - 1, PAGE_W - MARGIN, HEADER_BAND - 1);
}

function drawKpiCard(doc: jsPDF, x: number, y: number, w: number, label: string, value: string): void {
  doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, w, 22, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(label.toUpperCase(), x + 4, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(FG.r, FG.g, FG.b);
  doc.text(value, x + 4, y + 17);
  doc.setFont('helvetica', 'normal');
}

function drawLineChart(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  points: { x: string; v: number }[],
): void {
  doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'S');

  const innerPad = 5;
  const ix = x + innerPad;
  const iy = y + innerPad;
  const iw = w - innerPad * 2;
  const ih = h - innerPad * 2 - 6;
  const max = Math.max(1, ...points.map((p) => p.v));

  doc.setFontSize(6);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text('0', ix - 1, iy + ih);
  doc.text(String(max), ix - 1, iy + 3);

  if (points.length < 2) {
    doc.setFontSize(8);
    doc.text('Not enough data points for a trend in this range.', ix + 2, iy + ih / 2);
    return;
  }

  const step = iw / (points.length - 1);
  doc.setDrawColor(PRIMARY.r, PRIMARY.g, PRIMARY.b);
  doc.setLineWidth(0.5);
  for (let i = 0; i < points.length - 1; i += 1) {
    const x1 = ix + i * step;
    const y1 = iy + ih - (points[i].v / max) * ih;
    const x2 = ix + (i + 1) * step;
    const y2 = iy + ih - (points[i + 1].v / max) * ih;
    doc.line(x1, y1, x2, y2);
  }

  doc.setFillColor(PRIMARY.r, PRIMARY.g, PRIMARY.b);
  const n = points.length;
  points.forEach((p, i) => {
    const cx = ix + i * step;
    const cy = iy + ih - (p.v / max) * ih;
    doc.circle(cx, cy, 0.9, 'F');
  });

  const idxFirst = 0;
  const idxMid = Math.floor((n - 1) / 2);
  const idxLast = n - 1;
  doc.setFontSize(6);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(dayLabelShort(points[idxFirst].x), ix, y + h - 2);
  doc.text(dayLabelShort(points[idxMid].x), ix + iw / 2, y + h - 2, { align: 'center' });
  doc.text(dayLabelShort(points[idxLast].x), ix + iw, y + h - 2, { align: 'right' });
}

function drawVerticalBarChart(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  rows: { label: string; count: number }[],
  fill: { r: number; g: number; b: number },
): void {
  doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'S');
  const data = rows.slice(0, 10);
  if (data.length === 0) {
    doc.setFontSize(8);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text('No data for this chart.', x + 4, y + h / 2);
    return;
  }
  const max = Math.max(1, ...data.map((r) => r.count));
  const gap = 1.2;
  const barW = (w - 8 - gap * (data.length - 1)) / data.length;
  const barMaxH = h - 18;
  data.forEach((row, i) => {
    const bx = x + 4 + i * (barW + gap);
    const bh = (row.count / max) * barMaxH;
    const by = y + h - 10 - bh;
    doc.setFillColor(fill.r, fill.g, fill.b);
    doc.roundedRect(bx, by, barW, bh, 0.8, 0.8, 'F');
    doc.setFontSize(5.5);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    const short = truncateText(doc, shortMonthLabel(row.label), 9);
    doc.text(short, bx + barW / 2, y + h - 4, { align: 'center' });
  });
}

function drawHorizontalBarChart(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  rows: { name: string; count: number }[],
  maxRows: number,
  fill: { r: number; g: number; b: number },
): number {
  const data = rows.slice(0, maxRows);
  if (data.length === 0) return 0;
  const max = Math.max(1, ...data.map((r) => r.count));
  const rowH = 5.5;
  const labelW = 42;
  const barArea = w - labelW - 4;

  data.forEach((row, i) => {
    const ry = y + i * rowH;
    doc.setFontSize(7);
    doc.setTextColor(FG.r, FG.g, FG.b);
    doc.text(truncateText(doc, row.name, 22), x, ry + 4);
    const bw = (row.count / max) * barArea;
    doc.setFillColor(241, 245, 249);
    doc.rect(x + labelW, ry, barArea, 4, 'F');
    doc.setFillColor(fill.r, fill.g, fill.b);
    doc.rect(x + labelW, ry, Math.max(0.5, bw), 4, 'F');
    doc.setFontSize(6);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(String(row.count), x + labelW + barArea + 2, ry + 3.5);
  });

  return data.length * rowH;
}

function sectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(FG.r, FG.g, FG.b);
  doc.text(title, MARGIN, y);
  doc.setFont('helvetica', 'normal');
  return y + 6;
}

export type IntelligencePdfOptions = {
  dateFrom: string;
  dateTo: string;
  logoPath?: string;
};

/**
 * Builds a multi-page executive PDF with logo, KPIs, and chart graphics.
 */
export async function saveIntelligenceExecutivePdf(
  summary: IntelligenceSummaryForPdf,
  opts: IntelligencePdfOptions,
): Promise<void> {
  const logoDataUrl = await loadPublicAssetAsDataUrl(opts.logoPath ?? '/pest-trace.png');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const addFreshPage = (first = false) => {
    if (!first) doc.addPage();
    drawPageHeader(doc, logoDataUrl, opts.dateFrom, opts.dateTo, first);
  };

  addFreshPage(true);
  let y = HEADER_BAND + 8;

  doc.setFontSize(8);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(
    'Anonymised, aggregated telemetry. No client names, full addresses, or technician identities in this layer.',
    MARGIN,
    y,
    { maxWidth: PAGE_W - MARGIN * 2 },
  );
  y += 10;

  const cardW = (PAGE_W - MARGIN * 2 - 8) / 3;
  drawKpiCard(doc, MARGIN, y, cardW, 'Events (filtered)', String(summary.total));
  drawKpiCard(doc, MARGIN + cardW + 4, y, cardW, 'Leading category', summary.executive.topPest ?? '—');
  drawKpiCard(
    doc,
    MARGIN + (cardW + 4) * 2,
    y,
    cardW,
    'Share of volume',
    summary.executive.topPestShare != null ? `${summary.executive.topPestShare}%` : '—',
  );
  y += 30;

  y = sectionTitle(doc, y, 'Daily activity');
  const dayPts = summary.dayTrend.map((d) => ({ x: d.day, v: d.count }));
  drawLineChart(doc, MARGIN, y, PAGE_W - MARGIN * 2, 45, dayPts);
  y += 52;

  y = sectionTitle(doc, y, 'Monthly volume');
  const monthRows = summary.monthTrend.map((m) => ({
    label: m.month,
    count: m.count,
  }));
  drawVerticalBarChart(doc, MARGIN, y, PAGE_W - MARGIN * 2, 44, monthRows, BLUE);
  y += 50;

  if (y > 230) {
    addFreshPage(false);
    y = HEADER_BAND + 10;
  }

  y = sectionTitle(doc, y, 'Pest categories (normalised)');
  const pestH = drawHorizontalBarChart(doc, MARGIN, y, PAGE_W - MARGIN * 2, summary.byPestType, 10, PRIMARY);
  y += pestH + 10;

  if (y > 220) {
    addFreshPage(false);
    y = HEADER_BAND + 10;
  }

  y = sectionTitle(doc, y, 'Treatment outcome');
  const outH = drawHorizontalBarChart(doc, MARGIN, y, PAGE_W - MARGIN * 2, summary.byOutcome, 8, ACCENT);
  y += outH + 8;

  y = sectionTitle(doc, y, 'Infestation severity');
  const sevH = drawHorizontalBarChart(doc, MARGIN, y, PAGE_W - MARGIN * 2, summary.bySeverity, 8, {
    r: 128,
    g: 90,
    b: 213,
  });
  y += sevH + 8;

  if (y > 200) {
    addFreshPage(false);
    y = HEADER_BAND + 10;
  }

  y = sectionTitle(doc, y, 'Property-type profile');
  const propH = drawHorizontalBarChart(doc, MARGIN, y, PAGE_W - MARGIN * 2, summary.byProperty, 10, BLUE);
  y += propH + 12;

  if (summary.postcodeRedactedNote) {
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    doc.text(summary.postcodeRedactedNote, MARGIN, y, { maxWidth: PAGE_W - MARGIN * 2 });
    y += 8;
  }

  y = sectionTitle(doc, y, 'Postcode area rankings (k-anonymous)');
  doc.setFontSize(8);
  doc.setTextColor(FG.r, FG.g, FG.b);
  const tableRows = summary.postcodeRankings.slice(0, 18);
  if (tableRows.length === 0) {
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text('No qualifying areas in this filter (or all below disclosure threshold).', MARGIN, y);
    y += 8;
  } else {
    doc.setFillColor(241, 245, 249);
    doc.rect(MARGIN, y - 2, PAGE_W - MARGIN * 2, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('Outward code', MARGIN + 2, y + 2.5);
    doc.text('Events', PAGE_W - MARGIN - 22, y + 2.5);
    y += 8;
    doc.setFont('helvetica', 'normal');
    tableRows.forEach((r) => {
      if (y > PAGE_H - 22) {
        addFreshPage(false);
        y = HEADER_BAND + 10;
      }
      doc.setDrawColor(BORDER.r, BORDER.g, BORDER.b);
      doc.line(MARGIN, y - 1, PAGE_W - MARGIN, y - 1);
      doc.setFontSize(8);
      doc.setTextColor(FG.r, FG.g, FG.b);
      doc.text(r.area, MARGIN + 2, y + 3);
      doc.text(String(r.count), PAGE_W - MARGIN - 22, y + 3);
      y += 7;
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    drawFooter(doc, i, totalPages);
  }

  doc.save(`pesttrace-intelligence-executive-${opts.dateFrom}-to-${opts.dateTo}.pdf`);
}
