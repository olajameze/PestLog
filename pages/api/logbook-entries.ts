import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';

type LogbookPhotoRecord = { url: string };
type LogbookEntryWithPhotos = {
  id: string;
  companyId: string;
  technicianId: string;
  date: Date;
  clientName: string;
  address: string;
  treatment: string;
  notes: string | null;
  photoUrl: string | null;
  signature: string | null;
  createdAt: Date;
  photos: LogbookPhotoRecord[];
};

const prismaLogbook = prisma.logbookEntry as unknown as {
  findMany: (args: unknown) => Promise<LogbookEntryWithPhotos[]>;
  create: (args: unknown) => Promise<LogbookEntryWithPhotos>;
};

function shouldFallbackFromPhotosRelation(error: unknown): boolean {
  const message = String(error);
  return message.includes('LogbookPhoto') || message.includes('photos');
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
      const { companyId } = req.query;
      const company = await prisma.company.findFirst({
        where: { id: companyId as string, email: user.email },
      });
      if (!company) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      let entries: LogbookEntryWithPhotos[];
      try {
        entries = await prismaLogbook.findMany({
          where: { companyId: companyId as string },
          orderBy: { date: 'desc' },
          include: {
            photos: {
              select: { url: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        });
      } catch (error) {
        if (!shouldFallbackFromPhotosRelation(error)) throw error;
        const fallback = await prisma.logbookEntry.findMany({
          where: { companyId: companyId as string },
          orderBy: { date: 'desc' },
        });
        entries = fallback.map((entry) => ({ ...entry, photos: [] }));
      }
      return res.status(200).json(entries);
    } else if (req.method === 'POST') {
      const { companyId, date, clientName, address, treatment, notes, technicianId, photoUrl, photoUrls } = req.body;
      if (!companyId || !date || !clientName || !address || !treatment || !technicianId) {
        return res.status(400).json({ error: 'Missing required fields for logbook entry' });
      }

      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date value' });
      }
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
      const technician = await prisma.technician.findFirst({
        where: { id: technicianId, companyId },
      });
      if (!technician) {
        return res.status(400).json({ error: 'Invalid technician' });
      }
      let entry: LogbookEntryWithPhotos;
      try {
        entry = await prismaLogbook.create({
          data: {
            companyId,
            technicianId: technician.id,
            date: parsedDate,
            clientName,
            address,
            treatment,
            notes,
            photoUrl: primaryPhotoUrl,
            photos: normalizedPhotoUrls.length > 0
              ? {
                  create: normalizedPhotoUrls.map((url) => ({ url })),
                }
              : undefined,
          },
          include: {
            photos: {
              select: { url: true },
              orderBy: { createdAt: 'asc' },
            },
          },
        });
      } catch (error) {
        if (!shouldFallbackFromPhotosRelation(error)) throw error;
        const fallbackEntry = await prisma.logbookEntry.create({
          data: {
            companyId,
            technicianId: technician.id,
            date: parsedDate,
            clientName,
            address,
            treatment,
            notes,
            photoUrl: primaryPhotoUrl,
          },
        });
        entry = { ...fallbackEntry, photos: [] };
      }
      return res.status(201).json(entry);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (err) {
    return res.status(500).json({ error: 'Logbook request failed', details: String(err) });
  }
}