import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { AppNotification, parseNotifications } from '../../lib/notifications';
import { getCompanyRecipientEmailsNormalized } from '../../lib/push/companyRecipients';
import { sendWebPushToEmails } from '../../lib/push/sendWebPush';

function withNotificationPrefs(raw: unknown, notifications: AppNotification[]) {
  const base = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    ...base,
    notifications,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const ownerCompany = await prisma.company.findUnique({
    where: { email: user.email },
    select: { id: true, notificationPreferences: true },
  });

  let company = ownerCompany;
  if (!company) {
    const technician = await prisma.technician.findFirst({
      where: { email: user.email },
      select: {
        id: true,
        companyId: true,
      },
    });
    if (!technician) return res.status(404).json({ error: 'Company not found' });
    company = await prisma.company.findUnique({
      where: { id: technician.companyId },
      select: { id: true, notificationPreferences: true },
    });
    if (!company) return res.status(404).json({ error: 'Company not found' });
  }

  const notifications = parseNotifications(company.notificationPreferences);

  if (req.method === 'GET') {
    return res.status(200).json(notifications.slice(0, 80));
  }

  if (req.method === 'POST') {
    const action = typeof req.body?.action === 'string' ? req.body.action : '';
    if (action === 'mark_read') {
      const id = typeof req.body?.id === 'string' ? req.body.id : '';
      const next = notifications.map((item) => (item.id === id ? { ...item, read: true } : item));
      await prisma.company.update({
        where: { id: company.id },
        data: {
          notificationPreferences: withNotificationPrefs(company.notificationPreferences, next) as Prisma.InputJsonValue,
        },
      });
      return res.status(200).json({ success: true });
    }
    if (action === 'mark_all_read') {
      const next = notifications.map((item) => ({ ...item, read: true }));
      await prisma.company.update({
        where: { id: company.id },
        data: {
          notificationPreferences: withNotificationPrefs(company.notificationPreferences, next) as Prisma.InputJsonValue,
        },
      });
      return res.status(200).json({ success: true });
    }
    if (action === 'create') {
      if (!ownerCompany) {
        return res.status(403).json({ error: 'Only owner accounts can create notifications.' });
      }
      const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
      const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
      if (!title) return res.status(400).json({ error: 'Notification title is required.' });
      const severity =
        req.body?.severity === 'high' || req.body?.severity === 'medium' || req.body?.severity === 'low'
          ? req.body.severity
          : 'low';
      const nextItem: AppNotification = {
        id: randomUUID(),
        title,
        message,
        severity,
        read: false,
        createdAt: new Date().toISOString(),
      };
      const next = [nextItem, ...notifications].slice(0, 120);
      await prisma.company.update({
        where: { id: company.id },
        data: {
          notificationPreferences: withNotificationPrefs(company.notificationPreferences, next) as Prisma.InputJsonValue,
        },
      });
      void getCompanyRecipientEmailsNormalized(company.id)
        .then((emails) =>
          sendWebPushToEmails(emails, {
            title: nextItem.title,
            body: nextItem.message || 'Open Pest Trace for details.',
            url: '/dashboard',
            tag: `inapp-${nextItem.id}`,
          }),
        )
        .catch((e) => console.error('notifications web push', e));
      return res.status(201).json(nextItem);
    }
    return res.status(400).json({ error: 'Unsupported action.' });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method Not Allowed' });
}
