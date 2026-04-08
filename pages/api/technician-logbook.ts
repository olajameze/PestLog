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
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user || !user.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const technician = await prisma.technician.findFirst({
    where: { email: user.email },
  });

  if (!technician) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (req.method === 'GET') {
    let entries: LogbookEntryWithPhotos[];
    try {
      entries = await prismaLogbook.findMany({
        where: { technicianId: technician.id },
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
        where: { technicianId: technician.id },
        orderBy: { date: 'desc' },
      });
      entries = fallback.map((entry) => ({ ...entry, photos: [] }));
    }
    return res.status(200).json(entries);
  }

  if (req.method === 'POST') {
    const { date, clientName, address, treatment, notes, photoUrl, photoUrls, signature } = req.body;

    if (!date || !clientName || !address || !treatment) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const normalizedPhotoUrls = Array.isArray(photoUrls)
      ? photoUrls.filter((url): url is string => typeof url === 'string' && url.trim().length > 0).slice(0, 4)
      : [];
    const primaryPhotoUrl = normalizedPhotoUrls.length > 1
      ? JSON.stringify(normalizedPhotoUrls)
      : normalizedPhotoUrls[0] || (typeof photoUrl === 'string' && photoUrl.trim().length > 0 ? photoUrl : null);

    let entry: LogbookEntryWithPhotos;
    try {
      entry = await prismaLogbook.create({
        data: {
          companyId: technician.companyId,
          technicianId: technician.id,
          date: new Date(date),
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
          signature,
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
          companyId: technician.companyId,
          technicianId: technician.id,
          date: new Date(date),
          clientName,
          address,
          treatment,
          notes,
          photoUrl: primaryPhotoUrl,
          signature,
        },
      });
      entry = { ...fallbackEntry, photos: [] };
    }

    return res.status(201).json(entry);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
