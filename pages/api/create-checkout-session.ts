import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { normalizeAuthEmail } from '../../lib/auth/userSession';
import { resolveSiteOriginForApiRequest } from '../../lib/siteOrigin';

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

type Plan = 'pro' | 'business' | 'enterprise';

/** Duck-type Stripe SDK error for safe JSON + logging without importing internal classes. */
function extractStripeFields(error: unknown): { code?: string; param?: string; message?: string } {
  if (typeof error !== 'object' || error === null) return {};
  const o = error as Record<string, unknown>;
  const code = typeof o.code === 'string' ? o.code : undefined;
  const param = typeof o.param === 'string' ? o.param : undefined;
  const message = typeof o.message === 'string' ? o.message : undefined;
  return { code, param, message };
}

function stripeApiMode(secretKey?: string): 'live' | 'test' | 'unknown' {
  if (!secretKey) return 'unknown';
  if (secretKey.startsWith('sk_live') || secretKey.startsWith('rk_live')) return 'live';
  if (secretKey.startsWith('sk_test') || secretKey.startsWith('rk_test')) return 'test';
  return 'unknown';
}

const PRICE_IDS: Record<Plan, string> = {
  pro: process.env.STRIPE_PRICE_ID_PRO || '',
  business: process.env.STRIPE_PRICE_ID_BUSINESS || '',
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || '',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
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

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const authEmail = normalizeAuthEmail(user.email);

  const { plan } = req.body as { plan?: Plan };
  if (!plan || !(plan in PRICE_IDS)) {
    return res.status(400).json({ error: 'Invalid plan. Use "pro", "business" or "enterprise".' });
  }

  const selectedPlan = plan as Plan;
  const priceId = PRICE_IDS[selectedPlan];
  if (!priceId || !priceId.startsWith('price_')) {
    return res.status(500).json({
      error: `Stripe price id not configured for ${selectedPlan}. Ensure it starts with 'price_' in your environment variables.`,
    });
  }

  // Owner-only billing endpoint (email must match Company row — same normalization as onboarding).
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
        error: 'Technician accounts cannot manage subscription plans.',
        code: 'ROLE_TECHNICIAN',
      });
    }
  }

  if (!company) {
    return res.status(400).json({ error: 'No company found' });
  }

  try {
    let stripeCustomerId = company.stripeCustomerId;

    // If a customer ID exists, verify it belongs to the current Stripe mode (Test/Live)
    if (stripeCustomerId) {
      try {
        await stripe.customers.retrieve(stripeCustomerId);
      } catch (e) {
        // If Stripe returns a 404 or "resource_missing", the ID is from a different environment
        const stripeError = e as { status?: number; code?: string };
        if (stripeError.status === 404 || stripeError.code === 'resource_missing') {
          logger.warn(`Stripe Customer ${stripeCustomerId} not found in this mode. Resetting...`);
          stripeCustomerId = null;
        } else {
          throw e;
        }
      }
    }

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: authEmail,
        name: company.name ?? undefined,
        metadata: { companyId: company.id },
      });
      stripeCustomerId = customer.id;
      await prisma.company.update({
        where: { id: company.id },
        data: { stripeCustomerId },
      });
    }

    const stripeMode = stripeApiMode(process.env.STRIPE_SECRET_KEY);
    try {
      const pricePreview = await stripe.prices.retrieve(priceId);
      if (!pricePreview.active) {
        return res.status(500).json({
          error: `This plan’s Stripe price is inactive (${priceId}). Activate it in the Stripe Dashboard or set a new STRIPE_PRICE_ID_* in Vercel.`,
          code: 'STRIPE_PRICE_INACTIVE',
          stripePriceId: priceId,
          plan: selectedPlan,
        });
      }
      if (pricePreview.type !== 'recurring') {
        return res.status(500).json({
          error:
            `Checkout expects a recurring subscription price. Price ${priceId} is type "${pricePreview.type}". Create a recurring monthly price in Stripe.`,
          code: 'STRIPE_PRICE_NOT_RECURRING',
          stripePriceId: priceId,
          plan: selectedPlan,
        });
      }
    } catch (e) {
      const fe = extractStripeFields(e);
      if (fe.code === 'resource_missing') {
        return res.status(500).json({
          error: `Stripe could not find price ${priceId} in ${stripeMode === 'unknown' ? 'this' : stripeMode} mode. Open Stripe Dashboard → Products (toggle Test/Live to match STRIPE_SECRET_KEY), copy each plan’s Price ID, and update STRIPE_PRICE_ID_PRO / BUSINESS / ENTERPRISE in Vercel.`,
          code: 'STRIPE_PRICE_NOT_FOUND',
          stripeCode: fe.code,
          stripeParam: fe.param,
          stripePriceId: priceId,
          plan: selectedPlan,
          stripeApiMode: stripeMode,
        });
      }
      throw e;
    }

    const origin = resolveSiteOriginForApiRequest(req);
    if (!origin) {
      const hint =
        'Set NEXT_PUBLIC_APP_URL to your full public URL including https:// (e.g. https://www.pesttrace.com).';
      logger.error(`Checkout redirects: invalid or missing site origin. ${hint}`);
      return res.status(500).json({
        error: `Checkout redirects need a valid public URL. ${hint}`,
        code: 'CHECKOUT_ORIGIN_INVALID',
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      metadata: {
        companyId: company.id,
        plan: selectedPlan,
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        metadata: {
          companyId: company.id,
          plan: selectedPlan,
        },
      },
      success_url: `${origin}/reports?upgradedPlan=${selectedPlan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/upgrade`,
      client_reference_id: `${company.id}:${selectedPlan}`,
      // customer_email: user.email,  // removed - conflict w/ customer
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fe = extractStripeFields(error);
    logger.error(`Checkout session failed: ${errorMessage}${fe.code ? ` (${JSON.stringify(fe)})` : ''}`);
    let message = 'Unable to create checkout session. Please try again later.';
    if (fe.code === 'resource_missing') {
      if (typeof fe.param === 'string' && /price|line_items/i.test(fe.param)) {
        message =
          'Stripe rejected the checkout price ID. Ensure STRIPE_PRICE_ID_* matches a real recurring price from the Stripe Dashboard for the same test/live mode as STRIPE_SECRET_KEY.';
      }
    }

    const payload: Record<string, string | undefined> = {
      error: message,
    };
    if (fe.code) payload.stripeCode = fe.code;
    if (fe.param) payload.stripeParam = fe.param;
    res.status(500).json(payload);
  }
}