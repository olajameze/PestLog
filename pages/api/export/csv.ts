import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { prisma } from '../../../lib/prisma';

function csvEscape(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

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

  const start = typeof req.query.start === 'string' ? new Date(req.query.start) : null;
  const end = typeof req.query.end === 'string' ? new Date(req.query.end) : null;

  const entries = await prisma.logbookEntry.findMany({
    where: {
      companyId: company.id,
      ...(start && !isNaN(start.getTime()) ? { date: { gte: start } } : {}),
      ...(end && !isNaN(end.getTime()) ? { date: { ...(start && !isNaN(start.getTime()) ? { gte: start } : {}), lte: end } } : {}),
    },
    orderBy: { date: 'desc' },
  });

  const header = ['date', 'clientName', 'address', 'treatment', 'status', 'notes'];
  const lines = [header.join(',')];
  for (const entry of entries) {
    lines.push(
      [
        entry.date.toISOString(),
        csvEscape(entry.clientName ?? ''),
        csvEscape(entry.address ?? ''),
        csvEscape(entry.treatment ?? ''),
        csvEscape(entry.status ?? ''),
        csvEscape(entry.notes ?? ''),
      ].join(','),
    );
  }

  const filename = `pesttrace-logbook-${Date.now()}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(lines.join('\n'));
}

