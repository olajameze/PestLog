import { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { createSignedPhotoUrl, createSignedPhotoUrls, getPublicPhotoUrl } from '../../lib/supabase-admin';
import { checkPlan } from '../../lib/planGuard';

type LogbookEntryWhereInput = Prisma.LogbookEntryWhereInput;

type ReportPhotoRecord = { url: string };
type ReportEntryRecord = {
  id: string;
  date: Date;
  clientName: string;
  address: string;
  treatment: string;
  notes: string | null;
  photoUrl: string | null;
  signature: string | null;
  rooms?: Prisma.JsonValue | null;
  baitBoxesPlaced?: string | null;
  poisonUsed?: string | null;
  photos?: ReportPhotoRecord[];
};

function shouldFallbackFromPhotosRelation(error: unknown): boolean {
  const message = String(error);
  return message.includes('LogbookPhoto') || message.includes('photos');
}

async function signEntryPhotos(entry: ReportEntryRecord & { photos?: ReportPhotoRecord[] }): Promise<ReportEntryRecord & { photos?: ReportPhotoRecord[]; photoUrls?: string[] }> {
  const photoUrlsFromPrimary = (() => {
    if (!entry.photoUrl) return [];
    try {
      const parsed = JSON.parse(entry.photoUrl);
      return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
    } catch {
      return [entry.photoUrl];
    }
  })();

  const rawPhotoValues = [
    ...(entry.photos || []).map((photo) => photo.url),
    ...photoUrlsFromPrimary,
  ];

  const uniquePhotoValues = Array.from(new Set(rawPhotoValues.filter(Boolean)));
  const signedUniquePhotoValues = await createSignedPhotoUrls(uniquePhotoValues);
  const signedMap = new Map(uniquePhotoValues.map((value, index) => [value, signedUniquePhotoValues[index] || value]));
  const signedPrimaryPhoto = entry.photoUrl ? await createSignedPhotoUrl(entry.photoUrl) : null;

  const signedPhotos =
    (entry.photos || []).length > 0
      ? entry.photos!.map((photo) => ({
          ...photo,
          url: signedMap.get(photo.url) || photo.url,
        }))
      : [];

  const publicPhotoUrls = await Promise.all(photoUrlsFromPrimary.map((value) => getPublicPhotoUrl(value)));

  return {
    ...entry,
    photoUrl: signedPrimaryPhoto,
    photoUrls: publicPhotoUrls,
    photos: signedPhotos,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user || !user.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const company = await prisma.company.findUnique({
    where: { email: user.email },
    select: { id: true, name: true, email: true, plan: true },
  });

  if (!company) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Plan gating: Pro+ only
  if (!checkPlan(company.plan ?? 'trial', ['pro', 'business', 'enterprise'])) {
    return res.status(403).json({ error: 'Pro plan required for compliance reports' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const technicianId = req.query.technicianId as string;
  const search = (req.query.search as string) || '';
  if (!technicianId) {
    return res.status(400).json({ error: 'Technician ID required' });
  }

  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date('1970-01-01');
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
  endDate.setHours(23, 59, 59, 999);

  // Base where clause (no `as const` – use plain object)
  const baseWhereClause = {
    companyId: company.id,
    logbookEntryTechnicians: {
      some: {
        technicianId,
      },
    },
    date: {
      gte: startDate,
      lte: endDate,
    },
  };

  // Search clause
  let whereClause: LogbookEntryWhereInput = baseWhereClause;
  if (search.trim()) {
    const searchClause: LogbookEntryWhereInput = {
      OR: [
        { clientName: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ],
    };
    whereClause = {
      AND: [baseWhereClause, searchClause],
    };
  }

  let entries: ReportEntryRecord[];
  try {
    entries = await prisma.logbookEntry.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        clientName: true,
        address: true,
        treatment: true,
        notes: true,
        rooms: true,
        baitBoxesPlaced: true,
        poisonUsed: true,
        photoUrl: true,
        photos: {
          select: { url: true },
          orderBy: { createdAt: 'asc' },
        },
        signature: true,
      },
    });
  } catch (error) {
    if (!shouldFallbackFromPhotosRelation(error)) throw error;
    const fallback = await prisma.logbookEntry.findMany({
      where: baseWhereClause,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        clientName: true,
        address: true,
        treatment: true,
        notes: true,
        rooms: true,
        baitBoxesPlaced: true,
        poisonUsed: true,
        photoUrl: true,
        signature: true,
      },
    });
    entries = fallback.map((entry) => ({ ...entry, photos: [] }));
  }

  const certifications = await prisma.certification.findMany({
    where: { technicianId },
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      fileUrl: true,
      expiryDate: true,
      uploadedAt: true,
    },
  });

  return res.status(200).json({
    companyName: company.name || company.email,
    entries: await Promise.all(entries.map((entry) => signEntryPhotos(entry))),
    certifications,
  });
}