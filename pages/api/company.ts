import type { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get the authorization header
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
      // Get user's company or company via technician account
      let company = await prisma.company.findUnique({
        where: { email: user.email },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          website: true,
          vatNumber: true,
          requireSignature: true,
          requirePhotos: true,
          defaultReportRangeDays: true,
          notificationPreferences: true,
          stripeCustomerId: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          plan: true,
        },
      });

      if (!company) {
        const technician = await prisma.technician.findFirst({
          where: { email: user.email },
          include: { company: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true,
              website: true,
              vatNumber: true,
              requireSignature: true,
              requirePhotos: true,
              defaultReportRangeDays: true,
              notificationPreferences: true,
              stripeCustomerId: true,
              subscriptionStatus: true,
              trialEndsAt: true,
              plan: true,
            }
          } },
        });
        company = technician?.company ?? null;
      }

      return res.status(200).json(company);
    } else if (req.method === 'POST') {
      const {
        name,
        phone,
        address,
        website,
        vatNumber,
        requireSignature,
        requirePhotos,
        defaultReportRangeDays,
        notificationPreferences,
      } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Company name is required' });
      }

  const company = await prisma.company.upsert({
    where: { email: user.email },
    create: {
      name: name.trim(),
      phone: typeof phone === 'string' ? phone.trim() : undefined,
      address: typeof address === 'string' ? address.trim() : undefined,
      website: typeof website === 'string' ? website.trim() : undefined,
      vatNumber: typeof vatNumber === 'string' ? vatNumber.trim() : undefined,
      requireSignature: typeof requireSignature === 'boolean' ? requireSignature : false,
      requirePhotos: typeof requirePhotos === 'boolean' ? requirePhotos : false,
      defaultReportRangeDays: typeof defaultReportRangeDays === 'number' ? defaultReportRangeDays : 30,
      notificationPreferences: typeof notificationPreferences === 'object' ? notificationPreferences : {},
      email: user.email,
      subscriptionStatus: 'trial',
      plan: 'trial',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    update: {
      name: name.trim(),
      phone: typeof phone === 'string' ? phone.trim() : undefined,
      address: typeof address === 'string' ? address.trim() : undefined,
      website: typeof website === 'string' ? website.trim() : undefined,
      vatNumber: typeof vatNumber === 'string' ? vatNumber.trim() : undefined,
      requireSignature: typeof requireSignature === 'boolean' ? requireSignature : false,
      requirePhotos: typeof requirePhotos === 'boolean' ? requirePhotos : false,
      defaultReportRangeDays: typeof defaultReportRangeDays === 'number' ? defaultReportRangeDays : 30,
      notificationPreferences: typeof notificationPreferences === 'object' ? notificationPreferences : {},
    }
  });
  return res.status(200).json(company);
  } else if (req.method === 'PATCH') {
      const {
        name,
        phone,
        address,
        website,
        vatNumber,
        requireSignature,
        requirePhotos,
        defaultReportRangeDays,
        notificationPreferences,
      } = req.body;

      let company = await prisma.company.findUnique({
        where: { email: user.email },
      });

      if (!company) {
        const technician = await prisma.technician.findFirst({
          where: { email: user.email },
          include: { company: true },
        });
        company = technician?.company ?? null;
      }

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const updateData: Prisma.CompanyUpdateInput = {};
      if (name !== undefined) updateData.name = name.trim();
      if (phone !== undefined) updateData.phone = phone ? phone.trim() : null;
      if (address !== undefined) updateData.address = address ? address.trim() : null;
      if (website !== undefined) updateData.website = website ? website.trim() : null;
      if (vatNumber !== undefined) updateData.vatNumber = vatNumber ? vatNumber.trim() : null;
      if (typeof requireSignature === 'boolean') updateData.requireSignature = requireSignature;
      if (typeof requirePhotos === 'boolean') updateData.requirePhotos = requirePhotos;
      if (typeof defaultReportRangeDays === 'number') updateData.defaultReportRangeDays = defaultReportRangeDays;
      if (notificationPreferences && typeof notificationPreferences === 'object') updateData.notificationPreferences = notificationPreferences;

      const updatedCompany = await prisma.company.update({
        where: { id: company.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          website: true,
          vatNumber: true,
          requireSignature: true,
          requirePhotos: true,
          defaultReportRangeDays: true,
          notificationPreferences: true,
          stripeCustomerId: true,
          subscriptionStatus: true,
          trialEndsAt: true,
          plan: true,
        },
      });

      return res.status(200).json(updatedCompany);
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: String(error) });
  }
}
