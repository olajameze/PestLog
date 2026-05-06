import type { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { getRequestIp, isIpAllowed, parseEnterpriseSettings } from '../../lib/enterpriseFeatures';
import { normalizeAuthEmail } from '../../lib/auth/userSession';
import { technicianEmailWhere } from '../../lib/auth/technicianGate';

/** Walk nested Prisma/pg-adapter errors so 23502 responses name the failing column. */
function extractPostgresViolation(err: unknown):
  | { detail?: string; column?: string; constraint?: string; code?: string }
  | undefined {
  const acc: { detail?: string; column?: string; constraint?: string; code?: string } = {};
  const stack: unknown[] = [err];
  const seen = new Set<unknown>();
  while (stack.length > 0) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object') continue;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const o = cur as Record<string, unknown>;
    if (typeof o.detail === 'string' && acc.detail === undefined) acc.detail = o.detail;
    if (typeof o.column === 'string' && acc.column === undefined) acc.column = o.column;
    if (typeof o.column_name === 'string' && acc.column === undefined) acc.column = o.column_name;
    if (typeof o.constraint_name === 'string' && acc.constraint === undefined) {
      acc.constraint = o.constraint_name;
    }
    if (typeof o.originalCode === 'string' && acc.code === undefined) acc.code = o.originalCode;

    const push = (v: unknown) => {
      if (v && typeof v === 'object') stack.push(v);
    };
    push(o.cause);
    push(o.meta);
    const da = o.driverAdapterError;
    if (da && typeof da === 'object') {
      push(da);
      push((da as Record<string, unknown>).cause);
    }
  }
  return acc.detail || acc.column || acc.constraint || acc.code ? acc : undefined;
}

function notificationPreferencesSafe(raw: unknown): Prisma.InputJsonValue | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = { ...(raw as Record<string, unknown>) };
  delete o.apiKey;
  if (Object.keys(o).length === 0) return undefined;
  return o as Prisma.InputJsonValue;
}

/** Enterprise IP / verification gates apply only when the company is genuinely on Enterprise billing. */
function isPaidEnterprise(
  plan: string | null | undefined,
  subscriptionStatus: string | null | undefined,
): boolean {
  const p = (plan ?? '').toLowerCase();
  const s = (subscriptionStatus ?? '').toLowerCase();
  return p === 'enterprise' && s === 'active';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user?.email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ownerEmail = normalizeAuthEmail(user.email);

    if (req.method === 'GET') {
      let company = await prisma.company.findUnique({
        where: { email: ownerEmail },
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
        const technicianWithCompany = await prisma.technician.findFirst({
          where: technicianEmailWhere(ownerEmail),
          include: {
            company: {
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
            },
          },
        });
        if (technicianWithCompany?.company) {
          company = technicianWithCompany.company;
        }
      }

      if (!company) {
        return res.status(200).json(null);
      }

      if (company && isPaidEnterprise(company.plan, company.subscriptionStatus)) {
        const enterpriseSettings = parseEnterpriseSettings(company.notificationPreferences);
        if (enterpriseSettings.security.requireVerifiedEmail && !user.email_confirmed_at) {
          return res.status(403).json({
            error: 'Email verification is required by enterprise security policy.',
          });
        }
        if (enterpriseSettings.security.ipAllowlistEnabled) {
          const ip = getRequestIp(req);
          if (!isIpAllowed(ip, enterpriseSettings.security.allowedIps)) {
            return res.status(403).json({ error: 'Your IP is not allowed by enterprise security policy.' });
          }
        }
      }

      return res.status(200).json(company);
    }

    if (req.method === 'POST') {
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
      } = req.body ?? {};

      if (typeof name !== 'string') {
        return res.status(400).json({ error: 'Company name is required' });
      }
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ error: 'Company name is required' });
      }

      const existing = await prisma.company.findUnique({
        where: { email: ownerEmail },
        select: { id: true },
      });

      const technician = await prisma.technician.findFirst({
        where: technicianEmailWhere(ownerEmail),
        select: { id: true },
      });
      if (technician && !existing) {
        return res.status(403).json({
          error: 'Technician accounts cannot create or update billing company settings.',
          code: 'ROLE_TECHNICIAN',
        });
      }

      const prefs = notificationPreferencesSafe(notificationPreferences);
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const rowNow = new Date();
      const rangeDays =
        typeof defaultReportRangeDays === 'number' &&
        Number.isFinite(defaultReportRangeDays) &&
        defaultReportRangeDays > 0
          ? Math.round(defaultReportRangeDays)
          : 30;

      const sharedScalars = {
        name: trimmedName,
        phone:
          typeof phone === 'string' && phone.trim().length > 0 ? phone.trim() : undefined,
        address:
          typeof address === 'string' && address.trim().length > 0 ? address.trim() : undefined,
        website:
          typeof website === 'string' && website.trim().length > 0 ? website.trim() : undefined,
        vatNumber:
          typeof vatNumber === 'string' && vatNumber.trim().length > 0
            ? vatNumber.trim()
            : undefined,
        requireSignature: typeof requireSignature === 'boolean' ? requireSignature : false,
        requirePhotos: typeof requirePhotos === 'boolean' ? requirePhotos : false,
        defaultReportRangeDays: rangeDays,
      };

      const company = existing
        ? await prisma.company.update({
            where: { id: existing.id },
            data: {
              ...sharedScalars,
              ...(prefs !== undefined ? { notificationPreferences: prefs } : {}),
            },
          })
        : await prisma.company.create({
            data: {
              ...sharedScalars,
              ...(prefs !== undefined ? { notificationPreferences: prefs } : {}),
              email: ownerEmail,
              subscriptionStatus: 'trial',
              plan: 'trial',
              trialEndsAt: trialEnd,
              createdAt: rowNow,
              updatedAt: rowNow,
            },
          });

      return res.status(200).json(company);
    }

    if (req.method === 'PATCH') {
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
      } = req.body ?? {};

      const company = await prisma.company.findUnique({
        where: { email: ownerEmail },
      });

      if (!company) {
        const technician = await prisma.technician.findFirst({
          where: technicianEmailWhere(ownerEmail),
          select: { id: true },
        });
        if (technician) {
          return res.status(403).json({
            error: 'Technician accounts cannot update owner company settings.',
            code: 'ROLE_TECHNICIAN',
          });
        }
        return res.status(404).json({ error: 'Company not found' });
      }

      if (isPaidEnterprise(company.plan, company.subscriptionStatus)) {
        const enterpriseSettings = parseEnterpriseSettings(company.notificationPreferences);
        if (enterpriseSettings.security.requireVerifiedEmail && !user.email_confirmed_at) {
          return res.status(403).json({
            error: 'Email verification is required by enterprise security policy.',
          });
        }
        if (enterpriseSettings.security.ipAllowlistEnabled) {
          const ip = getRequestIp(req);
          if (!isIpAllowed(ip, enterpriseSettings.security.allowedIps)) {
            return res.status(403).json({ error: 'Your IP is not allowed by enterprise security policy.' });
          }
        }
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
      if (notificationPreferences && typeof notificationPreferences === 'object') {
        const patched = notificationPreferencesSafe(notificationPreferences);
        if (patched !== undefined) {
          updateData.notificationPreferences = patched;
        }
      }

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
    }

    res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    console.error('API error:', error);
    const payload: {
      error: string;
      details: string;
      prismaCode?: string;
      prismaMeta?: unknown;
      postgresViolation?: {
        detail?: string;
        column?: string;
        constraint?: string;
        code?: string;
      };
    } = {
      error: 'Internal server error',
      details: String(error),
    };
    const pgViolation = extractPostgresViolation(error);
    if (pgViolation) payload.postgresViolation = pgViolation;
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string'
    ) {
      const pe = error as { code: string; meta?: unknown };
      payload.prismaCode = pe.code;
      payload.prismaMeta = pe.meta;
      console.error('[company] Prisma', pe.code, pe.meta, pgViolation ?? '');
    }
    return res.status(500).json(payload);
  }
}
