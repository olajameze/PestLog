import { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { canAddTechnician, formatTechnicianLimit, getTechnicianLimit, normalizePlan } from '../../lib/planLimits';
import { normalizeAuthEmail } from '../../lib/auth/userSession';
import { technicianEmailWhere } from '../../lib/auth/technicianGate';

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

    const ownerEmail = normalizeAuthEmail(user.email);

    if (req.method === 'GET') {
      // Get company's technicians (narrow select so older DBs without newer Company columns still work)
      const company = await prisma.company.findUnique({
        where: { email: ownerEmail },
        select: { technicians: true },
      });
      if (!company) {
        const technician = await prisma.technician.findFirst({
          where: technicianEmailWhere(ownerEmail),
          select: { id: true },
        });
        if (technician) {
          return res.status(403).json({
            error: 'Technician accounts cannot manage company technicians.',
            code: 'ROLE_TECHNICIAN',
          });
        }
      }
      return res.status(200).json(company?.technicians || []);
    } else if (req.method === 'POST') {
      // Add technician
      const rawName = typeof req.body?.name === 'string' ? req.body.name : '';
      const rawEmail = typeof req.body?.email === 'string' ? req.body.email : '';
      const name = rawName.trim();
      const email = rawEmail.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email required' });
      }
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Enter a valid technician email address.' });
      }

      const company = await prisma.company.findUnique({
        where: { email: ownerEmail },
        select: { id: true, plan: true, technicians: true },
      });
      if (!company) {
        const technician = await prisma.technician.findFirst({
          where: technicianEmailWhere(ownerEmail),
          select: { id: true },
        });
        if (technician) {
          return res.status(403).json({
            error: 'Technician accounts cannot add technicians.',
            code: 'ROLE_TECHNICIAN',
          });
        }
        return res.status(400).json({ error: 'No company found' });
      }

      const resolvedPlan = normalizePlan(company.plan);
      if (!canAddTechnician(resolvedPlan, company.technicians.length)) {
        const limit = getTechnicianLimit(resolvedPlan);
        const limitLabel = formatTechnicianLimit(resolvedPlan);
        return res.status(403).json({
          error:
            limit === null
              ? 'Unable to add technician for this plan right now.'
              : `Your ${resolvedPlan.toUpperCase()} plan supports ${limitLabel.toLowerCase()}. You currently have ${company.technicians.length}. Upgrade to add more.`,
        });
      }

      const existingForCompany = await prisma.technician.findFirst({
        where: {
          companyId: company.id,
          ...technicianEmailWhere(email),
        },
        select: { id: true },
      });
      if (existingForCompany) {
        return res.status(409).json({ error: 'A technician with this email already exists for your company.' });
      }

      const technician = await prisma.technician.create({
        data: {
          id: randomUUID(),
          name,
          email,
          companyId: company.id,
          createdAt: new Date(),
        },
      });
      return res.status(201).json(technician);
    } else if (req.method === 'DELETE') {
      // Remove technician
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Technician ID required' });
      }
      const company = await prisma.company.findUnique({
        where: { email: ownerEmail },
        select: { id: true },
      });
      if (!company) {
        const technician = await prisma.technician.findFirst({
          where: technicianEmailWhere(ownerEmail),
          select: { id: true },
        });
        if (technician) {
          return res.status(403).json({
            error: 'Technician accounts cannot remove technicians.',
            code: 'ROLE_TECHNICIAN',
          });
        }
        return res.status(400).json({ error: 'No company found' });
      }
      // Verify technician belongs to company
      const technician = await prisma.technician.findFirst({
        where: { id: id as string, companyId: company.id },
      });
      if (!technician) {
        return res.status(404).json({ error: 'Technician not found' });
      }
      await prisma.technician.delete({
        where: { id: id as string },
      });
      return res.status(200).json({ message: 'Technician removed' });
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (err) {
    const errorText = String(err);
    if (errorText.includes('Unique constraint')) {
      return res.status(409).json({ error: 'A technician with this email already exists.' });
    }
    if (errorText.includes('Null constraint violation')) {
      return res.status(400).json({
        error: 'Invalid technician data. Please provide both name and email.',
      });
    }
    return res.status(500).json({ error: 'Technician request failed', details: String(err) });
  }
}