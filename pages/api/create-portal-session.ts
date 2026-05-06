import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { normalizeAuthEmail } from '../../lib/auth/userSession';
import { resolveSiteOriginForApiRequest, resolveStripePortalReturnUrl } from '../../lib/siteOrigin';

function stripeReturnHostLog(returnUrl: string): string {
  try {
    return new URL(returnUrl).hostname || '(bad-url)';
  } catch {
    return '(bad-url)';
  }
}

function parseStripePortalError(error: unknown): { message: string; code?: string; type?: string } {
  if (typeof error === 'object' && error !== null) {
    const o = error as Record<string, unknown>;
    const message = typeof o.message === 'string' ? o.message : 'Stripe request failed';
    const code = typeof o.code === 'string' ? o.code : undefined;
    const type = typeof o.type === 'string' ? o.type : undefined;
    return { message, code, type };
  }
  return { message: error instanceof Error ? error.message : String(error) };
}

function portalFailureHint(parsed: { message: string; code?: string }): string | undefined {
  const blob = `${parsed.message} ${parsed.code ?? ''}`.toLowerCase();
  if (blob.includes('not a valid url') || blob.includes('return_url') || parsed.code === 'url_invalid') {
    return 'Allow your dashboard domain in Stripe → Settings → Billing → Customer portal. For Vercel previews use a wildcard like https://*.vercel.app, or set STRIPE_PORTAL_RETURN_URL to your production https://…/dashboard?tab=settings.';
  }
  if (
    parsed.code === 'resource_missing' ||
    (blob.includes('configuration') && blob.includes('portal')) ||
    blob.includes('default customer portal configuration')
  ) {
    return 'Activate Customer portal in Stripe Dashboard (Billing → Customer portal) and save a configuration, or set STRIPE_BILLING_PORTAL_CONFIGURATION_ID to a bpc_… id from the API/Dashboard.';
  }
  if (blob.includes('no such customer')) {
    return 'This Stripe customer id is not in the same mode as STRIPE_SECRET_KEY (test vs live).';
  }
  return undefined;
}

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

  const configurationId = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID?.trim();

  const portalBase = {
    customer: company.stripeCustomerId,
    return_url: returnUrl,
    ...(configurationId ? { configuration: configurationId } : {}),
  } as const;

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
          ...portalBase,
          flow_data: {
            type: 'subscription_cancel',
            subscription_cancel: {
              subscription: target.id,
            },
          },
        });
        return res.status(200).json({ url: portalSession.url });
      } catch (flowErr) {
        const parsedFlow = parseStripePortalError(flowErr);
        logger.warn(
          `Stripe portal cancel deep-link failed, using default portal: ${parsedFlow.message} code=${parsedFlow.code ?? ''} return_host=${stripeReturnHostLog(returnUrl)}`,
        );
      }
    }

    const portalSession = await stripe.billingPortal.sessions.create({ ...portalBase });
    return res.status(200).json({ url: portalSession.url });
  } catch (error) {
    const parsed = parseStripePortalError(error);
    logger.error(
      `Stripe billingPortal.sessions.create failed: ${parsed.message} code=${parsed.code ?? ''} type=${parsed.type ?? ''} return_host=${stripeReturnHostLog(returnUrl)}`,
    );
    const hint = portalFailureHint(parsed);
    return res.status(500).json({
      error: parsed.message,
      ...(parsed.code ? { stripeCode: parsed.code } : {}),
      ...(hint ? { hint } : {}),
    });
  }
}
