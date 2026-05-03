import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { buildDashboardInsights } from '../../lib/dashboardInsights';
import type { DashboardDateRangeOption } from '../../lib/api/mockDashboardData';
import { hasSubscriptionAccess } from '../../lib/subscriptionAccess';
import {
  getRequestIp,
  isIpAllowed,
  parseEnterpriseSettings,
} from '../../lib/enterpriseFeatures';
import { parseNotifications } from '../../lib/notifications';
import { canUseEnterprisePreview } from '../../lib/trialEnterprisePreview';

async function resolveOwnerCompanyForUser(token: string) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user?.email) return null;

  const direct = await prisma.company.findUnique({
    where: { email: user.email },
    select: {
      id: true,
      requirePhotos: true,
      requireSignature: true,
      plan: true, // Ensure plan is selected for direct company access
      subscriptionStatus: true,
      trialEndsAt: true,
      notificationPreferences: true,
    },
  });
  return direct;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  const company = await resolveOwnerCompanyForUser(token);
  if (!company) {
    if (user?.email) {
      const technician = await prisma.technician.findFirst({
        where: { email: user.email },
        select: { id: true },
      });
      if (technician) {
        return res.status(403).json({
          error: 'Technician accounts cannot view dashboard insights.',
          code: 'ROLE_TECHNICIAN',
        });
      }
    }
    return res.status(403).json({ error: 'Company not found' });
  }

  if (!hasSubscriptionAccess(company)) {
    return res.status(403).json({ error: 'Trial expired. Upgrade required to continue using Pest Trace.' });
  }
  const enterpriseSettings = parseEnterpriseSettings(company.notificationPreferences);
  if (company.plan === 'enterprise') {
    if (enterpriseSettings.security.requireVerifiedEmail) {
      const userVerified = Boolean(
        (user as { email_confirmed_at?: string | null } | null)?.email_confirmed_at,
      );
      if (!userVerified) {
        return res.status(403).json({
          error: 'Email verification is required by enterprise security policy.',
        });
      }
    }
    if (enterpriseSettings.security.ipAllowlistEnabled) {
      const ip = getRequestIp(req);
      if (!isIpAllowed(ip, enterpriseSettings.security.allowedIps)) {
        return res.status(403).json({ error: 'Your IP is not allowed by enterprise security policy.' });
      }
    }
  }

  const raw = req.query.range;
  const range: DashboardDateRangeOption =
    raw === '7' || raw === '30' || raw === '90' ? raw : '30';

  try {
    const validPlans = ['trial', 'free', 'pro', 'business', 'enterprise'] as const;
    const resolvedPlan = validPlans.find((p) => p === company.plan) ?? 'trial';
    const policyPlan = resolvedPlan === 'trial' ? 'free' : resolvedPlan;

    const policy = {
      requirePhotos: company.requirePhotos ?? false,
      requireSignature: company.requireSignature ?? false,
      plan: policyPlan,
      featureTier: canUseEnterprisePreview(company) ? 'enterprise' : policyPlan,
    };
    const data = await buildDashboardInsights(prisma, company.id, policy, range, {
      npsResponses: enterpriseSettings.npsResponses,
    });
    const existing = parseNotifications(company.notificationPreferences);
    const bySource = new Map(existing.map((item) => [item.sourceId, item]));
    let changed = false;
    for (const alert of data.urgentAlerts) {
      const sourceId = `urgent:${alert.id}`;
      if (bySource.has(sourceId)) continue;
      existing.unshift({
        id: `${Date.now()}-${Math.random()}`,
        title: alert.title,
        message: alert.description,
        severity: alert.severity,
        read: false,
        createdAt: new Date().toISOString(),
        sourceId,
      });
      changed = true;
    }
    if (changed) {
      const base =
        company.notificationPreferences && typeof company.notificationPreferences === 'object'
          ? (company.notificationPreferences as Record<string, unknown>)
          : {};
      await prisma.company.update({
        where: { id: company.id },
        data: {
          notificationPreferences: {
            ...base,
            notifications: existing.slice(0, 120),
          },
        },
      });
    }
    return res.status(200).json(data);
  } catch (error) {
    console.error('dashboard-insights', error);
    return res.status(500).json({ error: 'Failed to load dashboard insights' });
  }
}
