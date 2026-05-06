import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { normalizeAuthEmail } from '../../lib/auth/userSession';
import { resolveSiteOriginForApiRequest, resolveStripePortalReturnUrl } from '../../lib/siteOrigin';

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
    throw new Error(
      'Stripe Secret Key is missing or using a placeholder value. Please update STRIPE_SECRET_KEY in .env.local with your actual key starting with sk_test_',
    );
  }
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

const PORTAL_CANCEL_STATUSES = new Set(['active', 'trialing', 'past_due', 'unpaid']);

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
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const stripe = (() => {
    try {
      return getStripe();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Stripe initialization failed: ${message}`);
      return null;
    }
  })();
  if (!stripe) return res.status(500).json({ error: 'Payment service configuration error.' });

  const authEmail = normalizeAuthEmail(user.email);
  const company = await prisma.company.findUnique({
    where: { email: authEmail },
  });

  if (!company) {
    const technician = await prisma.technician.findFirst({
      where: { email: authEmail },
      select: { id: true },
    });
    if (technician) {
      return res.status(403).json({
        error: 'Technician accounts cannot access billing portal.',
        code: 'ROLE_TECHNICIAN',
      });
    }
  }

  if (!company?.stripeCustomerId) {
    return res.status(400).json({ error: 'No Stripe customer configured for this account.' });
  }

  const origin = resolveSiteOriginForApiRequest(req);
  const fallbackReturn =
    origin ??
    (process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : null);
  if (!fallbackReturn || !/^https?:\/\//i.test(fallbackReturn)) {
    logger.error('Billing portal: invalid return URL — set NEXT_PUBLIC_APP_URL');
    return res.status(500).json({
      error:
        'Billing redirects are misconfigured. Set NEXT_PUBLIC_APP_URL or STRIPE_PORTAL_RETURN_URL.',
    });
  }
  const defaultReturn = `${fallbackReturn.replace(/\/+$/, '')}/dashboard?tab=settings`;
  const returnUrl = resolveStripePortalReturnUrl(defaultReturn);

  const intentRaw =
    typeof req.body?.intent === 'string'
      ? req.body.intent
      : typeof req.body?.flow === 'string'
        ? req.body.flow
        : '';
  const intent =
    intentRaw.toLowerCase() === 'cancel' ||
    intentRaw.toLowerCase() === 'subscription_cancel'
      ? 'cancel'
      : 'manage';

  try {
    if (intent === 'cancel') {
      const list = await stripe.subscriptions.list({
        customer: company.stripeCustomerId,
        status: 'all',
        limit: 30,
      });
      const target = list.data.find((s) => PORTAL_CANCEL_STATUSES.has(s.status));
      if (!target) {
        return res.status(400).json({
          error:
            'No cancellable subscription found on this account. Try “Manage subscription”, or contact support.',
        });
      }
      try {
        const portalSession = await stripe.billingPortal.sessions.create({
          customer: company.stripeCustomerId,
          return_url: returnUrl,
          flow_data: {
            type: 'subscription_cancel',
            subscription_cancel: {
              subscription: target.id,
            },
          },
        });
        return res.status(200).json({ url: portalSession.url });
      } catch (flowErr) {
        const msg = flowErr instanceof Error ? flowErr.message : String(flowErr);
        logger.warn(`Stripe portal cancel deep-link failed, using default portal: ${msg}`);
      }
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: returnUrl,
    });
    return res.status(200).json({ url: portalSession.url });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
