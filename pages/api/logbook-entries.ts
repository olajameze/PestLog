import type { NextApiRequest, NextApiResponse } from 'next';
import type { Prisma } from '@prisma/client';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { createSignedPhotoUrl, createSignedPhotoUrls } from '../../lib/supabase-admin';

type LogbookPhotoRecord = { url: string };
type LogbookEntryWithPhotos = {
  id: string;
  companyId: string;
  date: Date;
  clientName: string;
  address: string;
  treatment: string;
  notes: string | null;
  photoUrl: string | null;
  signature: string | null;
  rooms: Prisma.JsonValue | null;
  baitBoxesPlaced: string | null;
  poisonUsed: string | null;
  startTime: Date | null;
  endTime: Date | null;
  status: string;
  logbookEntryTechnicians: { technician: { name: string } }[];
  createdAt: Date;
  photos: LogbookPhotoRecord[];
};

function shouldFallbackFromPhotosRelation(error: unknown): boolean {
  const message = String(error);
  return message.includes('LogbookPhoto') || message.includes('photos');
}

async function signEntryPhotos<T extends { photoUrl: string | null; photos: { url: string }[] }>(entry: T): Promise<T> {
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
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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
      if (!company) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      let entries;
      try {
        entries = await prisma.logbookEntry.findMany({
          where,
          orderBy: { date: 'desc' },
          include: {
            photos: {
              select: { url: true },
              orderBy: { createdAt: 'asc' },
            },
            logbookEntryTechnicians: {
              include: {
                technician: true,
              },
            },
          },
        }) as unknown as LogbookEntryWithPhotos[];
      } catch (error) {
        if (!shouldFallbackFromPhotosRelation(error)) throw error;
        const fallback = await prisma.logbookEntry.findMany({
          where,
          orderBy: { date: 'desc' },
        });
        entries = fallback.map((entry) => ({
          ...entry,
          photos: [],
          logbookEntryTechnicians: [],
          rooms: null,
          baitBoxesPlaced: null,
          poisonUsed: null,
          startTime: null,
          endTime: null,
          status: 'open',
        })) as LogbookEntryWithPhotos[];
      }
      return res.status(200).json(await Promise.all(entries.map((entry) => signEntryPhotos(entry))));
    } else if (req.method === 'POST') {
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
      } = req.body;

      if (!companyId || !date || !clientName || !address || !treatment || !Array.isArray(technicianIds) || technicianIds.length === 0) {
        return res.status(400).json({ error: 'Missing required fields for logbook entry' });
      }

      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date value' });
      }
      const parsedStartTime = startTime ? new Date(startTime) : null;
      const parsedEndTime = endTime ? new Date(endTime) : null;
      const parsedRooms = Array.isArray(rooms) ? rooms : undefined;

      const normalizedPhotoUrls = Array.isArray(photoUrls)
        ? photoUrls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0).slice(0, 4)
        : [];
      const primaryPhotoUrl = normalizedPhotoUrls.length > 1
        ? JSON.stringify(normalizedPhotoUrls)
        : normalizedPhotoUrls[0] || (typeof photoUrl === 'string' && photoUrl.trim().length > 0 ? photoUrl : null);

      const company = await prisma.company.findFirst({
        where: { id: companyId, email: user.email },
      });
      if (!company) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const technicians = await prisma.technician.findMany({
        where: { id: { in: technicianIds as string[] }, companyId },
      });
      if (technicians.length !== technicianIds.length) {
        return res.status(400).json({ error: 'Invalid technician(s)' });
      }
      let entry: LogbookEntryWithPhotos;
      try {
        // Build a clean data object to avoid accidental undefined/null issues
        const entryData: any = {
          companyId,
          date: parsedDate,
          clientName,
          address,
          treatment,
          notes,
          photoUrl: primaryPhotoUrl,
          rooms: parsedRooms,
          baitBoxesPlaced,
          poisonUsed,
          startTime: parsedStartTime,
          endTime: parsedEndTime,
          status: status || "open",
        };

        if (normalizedPhotoUrls.length > 0) {
          entryData.photos = {
            create: normalizedPhotoUrls.map((url) => ({ url })),
          };
        }

        const newEntry = await prisma.logbookEntry.create({
          data: entryData,
          include: {
            photos: {
              select: { url: true },
              orderBy: { createdAt: 'asc' },
            },
            logbookEntryTechnicians: {
              include: {
                technician: {
                  select: { name: true }
                }
              }
            }
          },
        });
        await prisma.logbookEntryTechnician.createMany({
          data: technicianIds.map((techId: string) => ({
            logbookEntryId: newEntry.id,
            technicianId: techId,
          })),
        });
        entry = newEntry as unknown as LogbookEntryWithPhotos;
      } catch (error) {
        if (!shouldFallbackFromPhotosRelation(error)) {
          const err = error as any;
          const code = (err?.code as string) || '';
          const message = String(err ?? 'Logbook creation error');
          if (code.startsWith('P') || message.toLowerCase().includes('prisma')) {
            return res.status(400).json({ error: 'Logbook creation failed', details: message });
          }
          throw error;
        }
        const fallbackEntry = await prisma.logbookEntry.create({
          data: {
            companyId,
            date: parsedDate,
            clientName,
            address,
            treatment,
            notes,
            photoUrl: primaryPhotoUrl,
            rooms: parsedRooms,
            baitBoxesPlaced,
            poisonUsed,
            startTime: parsedStartTime,
            endTime: parsedEndTime,
            status: status || "open",
          },
        });
        await prisma.logbookEntryTechnician.createMany({
          data: technicianIds.map((techId: string) => ({
            logbookEntryId: fallbackEntry.id,
            technicianId: techId,
          })),
        });
        entry = {
          ...fallbackEntry,
          photos: [],
          logbookEntryTechnicians: [],
        } as LogbookEntryWithPhotos;
      }
      return res.status(201).json(await signEntryPhotos(entry));
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (err) {
    return res.status(500).json({ error: 'Logbook request failed', details: String(err) });
  }
}
