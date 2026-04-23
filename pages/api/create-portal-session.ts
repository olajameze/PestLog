import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  const isValidPrefix = key?.startsWith('sk_') || key?.startsWith('rk_');
  
  if (
    !key || 
    key.trim().length === 0 || 
    !isValidPrefix ||
    key === 'sk_test_...' || 
    key.includes('your-secret-key')
  ) {
    throw new Error('Stripe Secret Key is missing or using a placeholder value. Please update STRIPE_SECRET_KEY in .env.local with your actual key starting with sk_test_');
  }
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user || !user.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Fail fast with a clear message (prevents opaque 500s)
  const stripe = (() => {
    try {
      return getStripe();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Stripe initialization failed: ${message}`);
      return res.status(500).json({ error: 'Payment service configuration error.' });
    }
  })();
  if (!(stripe instanceof Stripe)) return;

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

  if (!company || !company.stripeCustomerId) {
    return res.status(400).json({ error: 'No Stripe customer configured for this account.' });
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
    const returnUrl = `${appUrl || vercelUrl || 'http://localhost:3000'}/dashboard`;
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: process.env.STRIPE_PORTAL_RETURN_URL || returnUrl,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
