import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { prisma } from '../../../lib/prisma';

export const config = {
  api: { responseLimit: '8mb' },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const company = await prisma.company.findUnique({ where: { email: user.email }, select: { id: true, name: true } });
  if (!company) return res.status(404).json({ error: 'Company not found' });

  const entries = await prisma.logbookEntry.findMany({
    where: { companyId: company.id },
    orderBy: { date: 'desc' },
    take: 200,
  });

  // Lightweight PDF generation to avoid adding deps. This produces a basic PDF (text only).
  const lines: string[] = [
    `Pest Trace Compliance Export`,
    `Company: ${company.name ?? ''}`,
    `Generated: ${new Date().toISOString()}`,
    '',
  ];
  for (const entry of entries) {
    lines.push(
      `- ${entry.date.toISOString()} | ${entry.clientName} | ${entry.address} | ${entry.treatment} | ${entry.status ?? ''}`,
    );
  }
  const text = lines.join('\n');

  // Minimal PDF wrapper (not pretty, but valid enough for download)
  const pdf = buildMinimalPdf(text);
  const filename = `pesttrace-logbook-${Date.now()}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(Buffer.from(pdf));
}

function buildMinimalPdf(text: string): Uint8Array {
  // Extremely small PDF generator: single page, Helvetica, draws text lines.
  // Based on PDF 1.4 basics. Keeps deps at zero.
  const escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .split('\n')
    .slice(0, 200);

  const contentLines = escaped.map((line, i) => `1 0 0 1 50 ${800 - i * 14} Tm (${line}) Tj`).join('\n');
  const contentStream = `BT\n/F1 10 Tf\n${contentLines}\nET`;

  const objects: string[] = [];
  objects.push('%PDF-1.4');

  const xref: number[] = [];
  const pushObj = (obj: string) => {
    xref.push(objects.join('\n').length + 1);
    objects.push(obj);
  };

  pushObj('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  pushObj('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj');
  pushObj('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj');
  pushObj('4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj');
  pushObj(`5 0 obj << /Length ${contentStream.length} >> stream\n${contentStream}\nendstream endobj`);

  const xrefStart = objects.join('\n').length + 1;
  let xrefTable = 'xref\n0 6\n0000000000 65535 f \n';
  for (const off of xref) {
    xrefTable += String(off).padStart(10, '0') + ' 00000 n \n';
  }
  const trailer = `trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const full = objects.join('\n') + '\n' + xrefTable + trailer;
  return new TextEncoder().encode(full);
}

