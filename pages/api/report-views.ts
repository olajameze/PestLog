import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';

type SavedViewFilters = {
  technicianId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  followUpOnly?: boolean;
};

type SavedView = {
  id: string;
  name: string;
  filters: SavedViewFilters;
  createdAt: string;
  updatedAt: string;
};

function parseSavedViews(raw: unknown): SavedView[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
  const value = (raw as Record<string, unknown>).savedReportViews;
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        id: typeof row.id === 'string' ? row.id : randomUUID(),
        name: typeof row.name === 'string' ? row.name : 'Saved view',
        filters: typeof row.filters === 'object' && row.filters ? (row.filters as SavedViewFilters) : {},
        createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
        updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : new Date().toISOString(),
      };
    });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const company = await prisma.company.findUnique({
    where: { email: user.email },
    select: { id: true, notificationPreferences: true },
  });

  if (!company) {
    const technician = await prisma.technician.findFirst({
      where: { email: user.email },
      select: { id: true },
    });
    if (technician) {
      return res.status(403).json({
        error: 'Technician accounts cannot manage saved report views.',
        code: 'ROLE_TECHNICIAN',
      });
    }
    return res.status(404).json({ error: 'Company not found' });
  }

  const existingPreferences =
    company.notificationPreferences && typeof company.notificationPreferences === 'object'
      ? (company.notificationPreferences as Record<string, unknown>)
      : {};
  const existingViews = parseSavedViews(existingPreferences);

  if (req.method === 'GET') {
    return res.status(200).json(existingViews);
  }

  if (req.method === 'POST') {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const filters = (req.body?.filters ?? {}) as SavedViewFilters;
    if (!name) return res.status(400).json({ error: 'View name is required.' });

    const now = new Date().toISOString();
    const nextView: SavedView = {
      id: randomUUID(),
      name,
      filters: {
        technicianId: typeof filters.technicianId === 'string' ? filters.technicianId : undefined,
        search: typeof filters.search === 'string' ? filters.search : undefined,
        startDate: typeof filters.startDate === 'string' ? filters.startDate : undefined,
        endDate: typeof filters.endDate === 'string' ? filters.endDate : undefined,
        followUpOnly: Boolean(filters.followUpOnly),
      },
      createdAt: now,
      updatedAt: now,
    };
    const nextViews = [nextView, ...existingViews].slice(0, 20);
    const nextPreferences = { ...existingPreferences, savedReportViews: nextViews };

    await prisma.company.update({
      where: { id: company.id },
      data: { notificationPreferences: nextPreferences as Prisma.InputJsonValue },
    });
    return res.status(201).json(nextView);
  }

  if (req.method === 'DELETE') {
    const id = typeof req.query.id === 'string' ? req.query.id : '';
    if (!id) return res.status(400).json({ error: 'Saved view ID is required.' });

    const nextViews = existingViews.filter((view) => view.id !== id);
    const nextPreferences = { ...existingPreferences, savedReportViews: nextViews };
    await prisma.company.update({
      where: { id: company.id },
      data: { notificationPreferences: nextPreferences as Prisma.InputJsonValue },
    });
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).json({ error: 'Method Not Allowed' });
}
