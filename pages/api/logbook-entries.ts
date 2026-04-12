import { Prisma } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { createSignedPhotoUrl, createSignedPhotoUrls } from '../../lib/supabase-admin';

type RawLogbookEntryFallback = {
  id: string;
  companyId: string;
  date: Date;
  clientName: string;
  address: string;
  treatment: string;
  notes: string | null;
  photoUrl: string | null;
  signature: string | null;
  rooms: unknown;
  baitBoxesPlaced: string | null;
  poisonUsed: string | null;
  followUpDate: Date | null;
  internalNotes: string | null;
  productAmount: string | null;
  recommendation: string | null;
  startTime: Date | null;
  endTime: Date | null;
  status: string;
  createdAt: Date;
};

function shouldFallbackFromPhotosRelation(error: unknown): boolean {
  const message = String(error);
  return message.includes('LogbookPhoto') || message.includes('photos');
}

function shouldFallbackFromJsonParse(error: unknown): boolean {
  const message = String(error);
  return message.includes('Unexpected end of JSON input') || message.includes('JSON');
}

function tryParseJson(value: unknown) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function signEntryPhotos<T extends { photoUrl: string | null; photos: { url: string }[] }>(
  entry: T,
): Promise<T> {
  const signedPhotos = await createSignedPhotoUrls(entry.photos.map((photo) => photo.url));
  const signedPrimaryPhoto = entry.photoUrl ? await createSignedPhotoUrl(entry.photoUrl) : null;
  return {
    ...entry,
    photoUrl: signedPrimaryPhoto,
    photos: entry.photos.map((photo, index) => ({
      ...photo,
      url: signedPhotos[index] || photo.url,
    })),
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user?.email) return res.status(401).json({ error: 'Unauthorized' });

    // GET: fetch logbook entries
    if (req.method === 'GET') {
      const { companyId, search } = req.query;
      const whereBase: Prisma.LogbookEntryWhereInput = { companyId: companyId as string };
      const where: Prisma.LogbookEntryWhereInput = search
        ? {
            ...whereBase,
            OR: [
              { clientName: { contains: search as string, mode: 'insensitive' } },
              { address: { contains: search as string, mode: 'insensitive' } },
            ],
          }
        : whereBase;

      const company = await prisma.company.findFirst({
        where: { id: companyId as string, email: user.email },
      });
      if (!company) return res.status(403).json({ error: 'Forbidden' });

      let entries;
      try {
        entries = await prisma.logbookEntry.findMany({
          where,
          orderBy: { date: 'desc' },
          include: {
            photos: { select: { url: true }, orderBy: { createdAt: 'asc' } },
            logbookEntryTechnicians: { include: { technician: true } },
          },
        });
      } catch (err) {
        if (!shouldFallbackFromPhotosRelation(err) && !shouldFallbackFromJsonParse(err)) throw err;

        const searchTerm = typeof req.query.search === 'string' && req.query.search.trim().length > 0
          ? `%${req.query.search.trim()}%`
          : null;

        const fallbackQuery = searchTerm
          ? Prisma.sql`
              SELECT id, company_id AS "companyId", date, client_name AS "clientName", address, treatment,
                     notes, photo_url AS "photoUrl", signature, rooms, bait_boxes_placed AS "baitBoxesPlaced",
                     poison_used AS "poisonUsed", follow_up_date AS "followUpDate", internal_notes AS "internalNotes",
                     product_amount AS "productAmount", recommendation, start_time AS "startTime", end_time AS "endTime",
                     status, created_at AS "createdAt"
              FROM "LogbookEntry"
              WHERE company_id = ${companyId} AND (client_name ILIKE ${searchTerm} OR address ILIKE ${searchTerm})
              ORDER BY date DESC
            `
          : Prisma.sql`
              SELECT id, company_id AS "companyId", date, client_name AS "clientName", address, treatment,
                     notes, photo_url AS "photoUrl", signature, rooms, bait_boxes_placed AS "baitBoxesPlaced",
                     poison_used AS "poisonUsed", follow_up_date AS "followUpDate", internal_notes AS "internalNotes",
                     product_amount AS "productAmount", recommendation, start_time AS "startTime", end_time AS "endTime",
                     status, created_at AS "createdAt"
              FROM "LogbookEntry"
              WHERE company_id = ${companyId}
              ORDER BY date DESC
            `;

        const fallback = await prisma.$queryRaw<RawLogbookEntryFallback[]>(fallbackQuery);
        entries = fallback.map((entry) => ({
          ...entry,
          rooms: tryParseJson(entry.rooms),
          photos: [],
          logbookEntryTechnicians: [],
        }));
      }
      return res.status(200).json(await Promise.all(entries.map(signEntryPhotos)));
    }

    // POST: create a new logbook entry
    if (req.method === 'POST') {
      const {
        companyId,
        date,
        clientName,
        address,
        treatment,
        notes,
        technicianIds,
        rooms,
        baitBoxesPlaced,
        poisonUsed,
        startTime,
        endTime,
        status,
        photoUrl,
        photoUrls,
        signature,
      } = req.body;

      if (
        !companyId ||
        !date ||
        !clientName ||
        !address ||
        !treatment ||
        !Array.isArray(technicianIds) ||
        technicianIds.length === 0
      ) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) return res.status(400).json({ error: 'Invalid date' });

      const company = await prisma.company.findFirst({ where: { id: companyId, email: user.email } });
      if (!company) return res.status(403).json({ error: 'Forbidden' });

      const technicians = await prisma.technician.findMany({
        where: { id: { in: technicianIds }, companyId },
      });
      if (technicians.length !== technicianIds.length) {
        return res.status(400).json({ error: 'Invalid technician(s)' });
      }

      const normalizedPhotoUrls = Array.isArray(photoUrls)
        ? photoUrls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0).slice(0, 4)
        : [];
      const primaryPhotoUrl =
        normalizedPhotoUrls.length > 1
          ? JSON.stringify(normalizedPhotoUrls)
          : normalizedPhotoUrls[0] ||
            (typeof photoUrl === 'string' && photoUrl.trim().length > 0 ? photoUrl : null);

      // Build data object with proper type (no `any`)
      const entryData: Prisma.LogbookEntryCreateInput = {
        company: { connect: { id: companyId } },
        date: parsedDate,
        clientName,
        address,
        treatment,
        notes: notes || null,
        photoUrl: primaryPhotoUrl,
        signature: typeof signature === 'string' && signature.trim().length > 0 ? signature : null,
        baitBoxesPlaced: baitBoxesPlaced ?? null,
        poisonUsed: poisonUsed ?? null,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        status: status || 'open',
      };

      if (Array.isArray(rooms)) {
        entryData.rooms = rooms as Prisma.InputJsonValue;
      } else if (typeof rooms === 'string' && rooms.trim()) {
        const parsedRooms = tryParseJson(rooms);
        if (Array.isArray(parsedRooms)) {
          entryData.rooms = parsedRooms as Prisma.InputJsonValue;
        } else {
          entryData.rooms = rooms.split(',').map((room) => room.trim()).filter(Boolean) as Prisma.InputJsonValue;
        }
      }

      // Add photos relation if any
      if (normalizedPhotoUrls.length > 0) {
        entryData.photos = {
          create: normalizedPhotoUrls.map((url) => ({ url })),
        };
      }

      let newEntry;
      try {
        newEntry = await prisma.logbookEntry.create({
          data: entryData,
          include: {
            photos: { select: { url: true }, orderBy: { createdAt: 'asc' } },
            logbookEntryTechnicians: { include: { technician: true } },
          },
        });
      } catch (err) {
        console.error('Create error:', err);
        return res.status(500).json({ error: 'Failed to create logbook entry', details: String(err) });
      }

      // Connect technicians via join table
      await prisma.logbookEntryTechnician.createMany({
        data: technicianIds.map((techId: string) => ({
          logbookEntryId: newEntry.id,
          technicianId: techId,
        })),
      });

      // Re-fetch to include join records
      const fullEntry = await prisma.logbookEntry.findUnique({
        where: { id: newEntry.id },
        include: {
          photos: { select: { url: true }, orderBy: { createdAt: 'asc' } },
          logbookEntryTechnicians: { include: { technician: true } },
        },
      });

      return res.status(201).json(await signEntryPhotos(fullEntry!));
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (err) {
    console.error('Logbook API error:', err);
    return res.status(500).json({ error: 'Logbook request failed', details: String(err) });
  }
}