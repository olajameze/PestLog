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
    select: { id: true, name: true, email: true, plan: true, subscriptionStatus: true },
  });

  let technician = null;
  let ownerMode = !!company;

  if (!company) {
    technician = await prisma.technician.findFirst({
      where: { email: user.email },
      include: {
        company: {
          select: { name: true, email: true, plan: true, subscriptionStatus: true, trialEndsAt: true }
        }
      }
    });
    if (!technician) {
      return res.status(403).json({ error: 'Access denied - no company or technician found' });
    }
    ownerMode = false;
  }
  // Plan gating for both owners and technicians - Pro+ required
  const companyForPlan = company || technician!.company;
  if (!companyForPlan) {
    return res.status(403).json({ error: 'Company not found for plan check' });
  }

  const hasPremiumAccess = companyForPlan.plan
    ? checkPlan(companyForPlan.plan, ['pro', 'business', 'enterprise'])
    : companyForPlan.subscriptionStatus === 'active';

  const trialEndsAt = 'trialEndsAt' in companyForPlan ? (companyForPlan as { trialEndsAt?: string | null }).trialEndsAt : null;
  const trialExpired = trialEndsAt ? new Date(trialEndsAt).getTime() < Date.now() : false;

  if (!hasPremiumAccess && trialExpired) {
    return res.status(403).json({ error: 'Upgrade to Pro+ plan required for reports. Trial expired.' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const queryTechnicianId = req.query.technicianId as string;
  const search = (req.query.search as string) || '';
  let technicianId: string;

  if (ownerMode) {
    if (!queryTechnicianId) {
      return res.status(400).json({ error: 'Technician ID required for owner reports' });
    }
    technicianId = queryTechnicianId;
  } else {
    technicianId = technician!.id;
  }

  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date('1970-01-01');
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
  endDate.setHours(23, 59, 59, 999);

  // Base where clause
  const baseWhereClause: LogbookEntryWhereInput = ownerMode 
    ? {
        companyId: company!.id,
        logbookEntryTechnicians: {
          some: { technicianId },
        },
        date: { gte: startDate, lte: endDate },
      }
    : {
        logbookEntryTechnicians: {
          some: { technicianId },
        },
        date: { gte: startDate, lte: endDate },
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
        signature: true,
      },
    });
    entries = fallback.map((entry) => ({ ...entry, photos: [] }));
  }

  const certWhere = ownerMode ? { technicianId } : { technicianId: technician!.id };
  const certifications = await prisma.certification.findMany({
    where: certWhere,
    orderBy: { uploadedAt: 'desc' },
    select: {
      id: true,
      fileUrl: true,
      expiryDate: true,
      uploadedAt: true,
    },
  });

  const companyName = ownerMode 
    ? (company!.name || company!.email)
    : (technician!.company?.name || technician!.company?.email || 'Your Company');

  return res.status(200).json({
    companyName,
    entries: await Promise.all(entries.map((entry) => signEntryPhotos(entry))),
    certifications,
  });
}
