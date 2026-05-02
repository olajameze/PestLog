import type { NextApiRequest, NextApiResponse } from 'next';
import type { Prisma } from '@prisma/client';
import { supabase } from '../../../lib/supabase';
import { prisma } from '../../../lib/prisma';
import {
  getRequestIp,
  isIpAllowed,
  mergeEnterpriseSettings,
  parseEnterpriseSettings,
} from '../../../lib/enterpriseFeatures';
import { writeAuditLog } from '../../../lib/audit/log';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const company = await prisma.company.findUnique({
    where: { email: user.email },
    select: { id: true, plan: true, notificationPreferences: true },
  });
  if (!company) return res.status(403).json({ error: 'Forbidden' });
  if (company.plan !== 'enterprise') return res.status(403).json({ error: 'Enterprise plan required' });

  const enterprise = parseEnterpriseSettings(company.notificationPreferences);
  if (enterprise.security.requireVerifiedEmail && !user.email_confirmed_at) {
    return res.status(403).json({ error: 'Email verification is required by enterprise security policy.' });
  }
  if (enterprise.security.ipAllowlistEnabled) {
    const ip = getRequestIp(req);
    if (!isIpAllowed(ip, enterprise.security.allowedIps)) {
      return res.status(403).json({ error: 'Your IP is not allowed by enterprise security policy.' });
    }
  }

  if (req.method === 'GET') {
    return res.status(200).json({ responses: enterprise.npsResponses.slice(-20).reverse() });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const score = Number(req.body?.score);
  const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
  if (!Number.isFinite(score) || score < 0 || score > 10) {
    return res.status(400).json({ error: 'NPS score must be between 0 and 10.' });
  }

  const updatedSettings = {
    ...enterprise,
    npsResponses: [
      ...enterprise.npsResponses,
      {
        score,
        comment: comment || undefined,
        submittedAt: new Date().toISOString(),
      },
    ],
  };

  const updatedNotificationPreferences = mergeEnterpriseSettings(
    company.notificationPreferences,
    updatedSettings,
  );

  await prisma.company.update({
    where: { id: company.id },
    data: { notificationPreferences: updatedNotificationPreferences as Prisma.InputJsonValue },
  });

  await writeAuditLog({
    userId: user.id,
    action: 'CREATE',
    tableName: 'enterprise_nps_feedback',
    recordId: company.id,
    newValues: { score, comment: comment || null },
    ipAddress: getRequestIp(req) || null,
  });

  return res.status(201).json({ success: true });
}

