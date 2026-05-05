import webpush from 'web-push';
import { prisma } from '../prisma';
import { logger } from '../logger';

export type WebPushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

function getVapidPublicKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ||
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim()
  );
}

function getVapidPrivateKey(): string | undefined {
  return process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
}

function getVapidSubject(): string {
  const support = process.env.SUPPORT_EMAIL?.trim();
  if (support) return `mailto:${support}`;
  const configured = process.env.WEB_PUSH_VAPID_SUBJECT?.trim();
  if (configured) return configured;
  return 'mailto:support@pesttrace.com';
}

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  const publicKey = getVapidPublicKey();
  const privateKey = getVapidPrivateKey();
  if (!publicKey || !privateKey) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(getVapidSubject(), publicKey, privateKey);
    vapidConfigured = true;
  }
  return true;
}

export function isWebPushConfigured(): boolean {
  return Boolean(getVapidPublicKey() && getVapidPrivateKey());
}

export async function sendWebPushToEmails(emails: string[], payload: WebPushPayload): Promise<void> {
  if (emails.length === 0) return;
  if (!ensureVapidConfigured()) {
    logger.warn('Web push skipped: set NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY and WEB_PUSH_VAPID_PRIVATE_KEY');
    return;
  }

  const normalized = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  const subs = await prisma.pushSubscription.findMany({
    where: { email: { in: normalized } },
  });
  if (subs.length === 0) return;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/dashboard',
    tag: payload.tag ?? 'pesttrace-notification',
  });

  await Promise.all(
    subs.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };
      try {
        await webpush.sendNotification(pushSub, body, { TTL: 3600 });
      } catch (err: unknown) {
        const statusCode =
          err && typeof err === 'object' && 'statusCode' in err
            ? Number((err as { statusCode: number }).statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => null);
        } else {
          logger.warn(`Web push failed for ${sub.email}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }),
  );
}
