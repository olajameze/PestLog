import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';

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
  photos: ReportPhotoRecord[];
};

const prismaLogbook = prisma.logbookEntry as unknown as {
  findMany: (args: unknown) => Promise<ReportEntryRecord[]>;
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

  const company = await prisma.company.findUnique({
    where: { email: user.email },
  });

  if (!company) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const technicianId = req.query.technicianId as string;
  if (!technicianId) {
    return res.status(400).json({ error: 'Technician ID required' });
  }

  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date('1970-01-01');
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
  endDate.setHours(23, 59, 59, 999);

  let entries: ReportEntryRecord[];
  try {
    entries = await prismaLogbook.findMany({
      where: {
        companyId: company.id,
        technicianId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        clientName: true,
        address: true,
        treatment: true,
        notes: true,
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
      where: {
        companyId: company.id,
        technicianId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        date: true,
        clientName: true,
        address: true,
        treatment: true,
        notes: true,
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
    entries,
    certifications,
  });
}
