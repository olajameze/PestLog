import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { createSignedPhotoUrl, createSignedPhotoUrls } from '../../lib/supabase-admin';

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
    const entries = await prisma.logbookEntry.findMany({
      where: {
        logbookEntryTechnicians: {
          some: {
            technicianId: technician.id
          }
        }
      },
      orderBy: { date: 'desc' },
      include: {
        photos: {
          select: { url: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    }) as unknown as LogbookEntryWithPhotos[];

    return res.status(200).json(await Promise.all(entries.map((entry) => signEntryPhotos(entry))));
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

    const newEntry = await prisma.logbookEntry.create({
      data: {
        companyId: technician.companyId,
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
        logbookEntryTechnicians: {
          create: [{ technicianId: technician.id }]
        }
      },
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
    });

    return res.status(201).json(await signEntryPhotos(newEntry as unknown as LogbookEntryWithPhotos));
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
