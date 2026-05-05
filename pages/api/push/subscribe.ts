import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';
import { supabase } from '../../../lib/supabase';

type SubscriptionJson = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

type Body = {
  subscription?: SubscriptionJson;
  userAgent?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const email = user.email.trim().toLowerCase();

  if (req.method === 'DELETE') {
    const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : '';
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
    await prisma.pushSubscription.deleteMany({
      where: { email, endpoint },
    });
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as Body;
  const sub = body.subscription;
  const endpoint = typeof sub?.endpoint === 'string' ? sub.endpoint : '';
  const p256dh = typeof sub?.keys?.p256dh === 'string' ? sub.keys.p256dh : '';
  const auth = typeof sub?.keys?.auth === 'string' ? sub.keys.auth : '';
  if (!endpoint || !p256dh || !auth) {
    return res.status(400).json({ error: 'Invalid subscription payload' });
  }

  const userAgent = typeof body.userAgent === 'string' ? body.userAgent.slice(0, 512) : null;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      email,
      endpoint,
      p256dh,
      auth,
      userAgent,
    },
    update: {
      email,
      p256dh,
      auth,
      userAgent,
    },
  });

  return res.status(200).json({ ok: true });
}
