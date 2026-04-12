import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { supabase } from '../../../lib/supabase';
import { checkPlan } from '../../../lib/planGuard';

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

  const company = await prisma.company.findUnique({
    where: { email: user.email },
    select: { id: true, subscriptionStatus: true, trialEndsAt: true },
  });
  if (!company) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const isSubscriptionValid =
    company.subscriptionStatus === 'active' ||
    (company.subscriptionStatus === 'trial' && company.trialEndsAt && company.trialEndsAt.getTime() > Date.now());

  if (!isSubscriptionValid) {
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

    const { date, clientName, address, treatment, notes, technicianIds, followUpDate, internalNotes, productAmount, recommendation, rooms, baitStations, baitBoxesPlaced, poisonUsed, startTime, endTime, status, photoUrls, signature } = req.body;
    if (!date || !clientName || !address || !treatment || !technicianIds || !Array.isArray(technicianIds) || technicianIds.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Delete old join records
    await prisma.logbookEntryTechnician.deleteMany({
      where: { logbookEntryId: id }
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

    // Update entry
    const updatedEntry = await prisma.logbookEntry.update({
      where: { id },
      data: {
        date: new Date(date),
        clientName,
        address,
        treatment,
        notes,
        photoUrl: photoUrls?.length > 1 ? JSON.stringify(photoUrls) : photoUrls?.[0] || null,
        signature,
        rooms: Array.isArray(rooms) ? rooms : undefined,
        followUpDate: followUpDate ? new Date(followUpDate) : undefined,
        internalNotes: internalNotes ?? undefined,
        productAmount: productAmount ?? undefined,
        recommendation: recommendation ?? undefined,
        baitBoxesPlaced,
        poisonUsed,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        status: status || "open",
      },
    });
    // Update baitStations if provided
    if (Array.isArray(baitStations) && baitStations.length > 0) {
      // Remove old stations for this entry and insert new ones
      await prisma.baitStation.deleteMany({ where: { logbookEntryId: id } });
      await prisma.baitStation.createMany({
        data: baitStations.map((bs: any) => ({
          logbookEntryId: id,
          stationId: bs.stationId,
          location: bs.location,
          baitType: bs.baitType,
          amount: bs.amount,
        })),
      });
    }
    return res.status(200).json(updatedEntry);
  }

  if (req.method === 'DELETE') {
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

