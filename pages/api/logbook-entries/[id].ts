import { randomUUID } from 'crypto';
import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { supabase } from '../../../lib/supabase';
import { hasSubscriptionAccess } from '../../../lib/subscriptionAccess';
import { normalizeAuthEmail } from '../../../lib/auth/userSession';

type CompanyForAccess = {
  id: string;
  subscriptionStatus: string | null;
  trialEndsAt: Date | null;
  paymentGraceEndsAt: Date | null;
  plan: string | null;
};

async function resolveCompanyForEntryAccess(userEmail: string): Promise<CompanyForAccess | null> {
  const email = normalizeAuthEmail(userEmail);
  const asOwner = await prisma.company.findUnique({
    where: { email },
    select: {
      id: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      paymentGraceEndsAt: true,
      plan: true,
    },
  });
  if (asOwner) return asOwner;

  const tech = await prisma.technician.findFirst({
    where: { email },
    select: {
      companyId: true,
      company: {
        select: {
          id: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          paymentGraceEndsAt: true,
          plan: true,
        },
      },
    },
  });
  if (!tech?.company) return null;
  return tech.company;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const company = await resolveCompanyForEntryAccess(user.email);
  if (!company) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!hasSubscriptionAccess(company)) {
    return res.status(403).json({ error: 'Subscription required or trial expired' });
  }

  if (req.method === 'PUT') {
    const entry = await prisma.logbookEntry.findUnique({
      where: { id },
      select: { companyId: true }
    });
    if (!entry || entry.companyId !== company.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { date, clientName, address, treatment, notes, technicianIds, followUpDate, internalNotes, productAmount, recommendation, cancellationReason, rooms, baitStations, baitBoxesPlaced, poisonUsed, startTime, endTime, status, photoUrls, signature } = req.body;
    if (!date || !clientName || !address || !treatment || !technicianIds || !Array.isArray(technicianIds) || technicianIds.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Delete old join records
    await prisma.logbookEntryTechnician.deleteMany({
      where: { logbookEntryId: id },
    });

    // Create new join records
    const technicians = await prisma.technician.findMany({
      where: { id: { in: technicianIds as string[] }, companyId: company.id },
    });
    if (technicians.length !== technicianIds.length) {
      return res.status(400).json({ error: 'Invalid technician(s)' });
    }
    await prisma.logbookEntryTechnician.createMany({
      data: technicianIds.map((techId: string) => ({
        logbookEntryId: id,
        technicianId: techId,
      })),
    });

    const shouldUpdatePhotos = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'photoUrls') && Array.isArray(photoUrls);
    const normalizedPhotoUrls = shouldUpdatePhotos
      ? (photoUrls as unknown[]).filter((url): url is string => typeof url === 'string' && url.trim().length > 0).slice(0, 4)
      : [];
    const primaryPhotoUrl =
      normalizedPhotoUrls.length > 1
        ? JSON.stringify(normalizedPhotoUrls)
        : normalizedPhotoUrls[0] || null;

    // Update entry
    const updatedEntry = await prisma.logbookEntry.update({
      where: { id },
      data: {
        date: new Date(date),
        clientName,
        address,
        treatment,
        notes,
        ...(shouldUpdatePhotos ? { photoUrl: primaryPhotoUrl } : {}),
        signature,
        rooms: Array.isArray(rooms) ? rooms : undefined,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
        internalNotes: internalNotes ?? undefined,
        productAmount: productAmount ?? undefined,
        recommendation: recommendation ?? undefined,
        ...(status && (status.toLowerCase() === 'cancelled' || status.toLowerCase() === 'canceled')
          ? {
              recommendation:
                (typeof cancellationReason === 'string' ? cancellationReason.trim() : '') ||
                (typeof recommendation === 'string' ? recommendation.trim() : '') ||
                undefined,
            }
          : {}),
        baitBoxesPlaced,
        poisonUsed,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        status: status || "open",
      },
    });

    if (shouldUpdatePhotos) {
      await prisma.logbookPhoto.deleteMany({ where: { logbookEntryId: id } });
      if (normalizedPhotoUrls.length > 0) {
        await prisma.logbookPhoto.createMany({
          data: normalizedPhotoUrls.map((url) => ({
            id: randomUUID(),
            logbookEntryId: id,
            url,
            createdAt: new Date(),
          })),
        });
      }
    }

    // Update baitStations if provided
    if (Array.isArray(baitStations) && baitStations.length > 0) {
      // Remove old stations for this entry and insert new ones
      await prisma.baitStation.deleteMany({ where: { logbookEntryId: id } });
      await prisma.baitStation.createMany({
        data: baitStations.map(
          (bs: {
            stationId: string;
            location: string;
            baitType?: string | null;
            amount?: string | null;
          }) => ({
            logbookEntryId: id,
            stationId: bs.stationId,
            location: bs.location,
            baitType: bs.baitType,
            amount: bs.amount,
          }),
        ),
      });
    }
    return res.status(200).json(updatedEntry);
  }

  if (req.method === 'DELETE') {
    const ownerCompany = await prisma.company.findUnique({
      where: { email: normalizeAuthEmail(user.email) },
      select: { id: true },
    });
    if (!ownerCompany || ownerCompany.id !== company.id) {
      return res.status(403).json({ error: 'Only business owners can delete logbook entries.' });
    }

    const entry = await prisma.logbookEntry.findUnique({
      where: { id },
      select: { companyId: true }
    });
    if (!entry || entry.companyId !== company.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.logbookEntry.delete({
      where: { id },
    });
    return res.status(200).json({ message: 'Entry deleted' });
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}

