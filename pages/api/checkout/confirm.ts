import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '../../../lib/supabase';
import { prisma } from '../../../lib/prisma';

type Plan = 'pro' | 'business' | 'enterprise';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  const isValidPrefix = key?.startsWith('sk_') || key?.startsWith('rk_');
  if (!key || !isValidPrefix || key === 'sk_test_...' || key.includes('your-secret-key')) {
    throw new Error('Stripe Secret Key is missing or invalid.');
  }
  return new Stripe(key, { apiVersion: '2024-06-20' });
}

function resolvePlan(
  session: Stripe.Checkout.Session,
  subscription: Stripe.Subscription | null,
): Plan | null {
  const fromSessionMetadata = session.metadata?.plan;
  const fromSubscriptionMetadata = subscription?.metadata?.plan;
  const fromReference = session.client_reference_id?.split(':')?.[1];
  const candidate = fromSessionMetadata || fromSubscriptionMetadata || fromReference;
  if (candidate === 'pro' || candidate === 'business' || candidate === 'enterprise') return candidate;
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user?.email) return res.status(401).json({ error: 'Unauthorized' });

  const sessionId = typeof req.body?.sessionId === 'string' ? req.body.sessionId : '';
  if (!sessionId || !sessionId.startsWith('cs_')) {
    return res.status(400).json({ error: 'Invalid session id' });
  }

  const company = await prisma.company.findUnique({
    where: { email: user.email },
    select: { id: true, stripeCustomerId: true },
  });
  if (!company) {
    const technician = await prisma.technician.findFirst({
      where: { email: user.email },
      select: { id: true },
    });
    if (technician) {
      return res.status(403).json({
        error: 'Technician accounts cannot confirm billing checkouts.',
        code: 'ROLE_TECHNICIAN',
      });
    }
  }
  if (!company) return res.status(404).json({ error: 'Company not found' });

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    const sessionCompanyId = session.metadata?.companyId || session.client_reference_id?.split(':')?.[0];
    if (!sessionCompanyId || sessionCompanyId !== company.id) {
      return res.status(403).json({ error: 'Session does not belong to this company' });
    }

    const subscription =
      session.subscription && typeof session.subscription !== 'string'
        ? (session.subscription as Stripe.Subscription)
        : null;
    const resolvedPlan = resolvePlan(session, subscription);
    if (!resolvedPlan) {
      return res.status(400).json({ error: 'Unable to resolve plan from checkout session' });
    }

    const stripeCustomerId =
      typeof session.customer === 'string'
        ? session.customer
        : (session.customer as Stripe.Customer | null)?.id;

    const status = subscription?.status === 'active' ? 'active' : 'active';

    const updated = await prisma.company.update({
      where: { id: company.id },
      data: {
        ...(stripeCustomerId ? { stripeCustomerId } : {}),
        plan: resolvedPlan,
        subscriptionStatus: status,
        trialEndsAt: null,
      },
      select: { plan: true, subscriptionStatus: true },
    });

    return res.status(200).json({ ok: true, plan: updated.plan, status: updated.subscriptionStatus });
  } catch (e) {
    return res.status(500).json({ error: `Failed to confirm checkout: ${e instanceof Error ? e.message : String(e)}` });
  }
}
