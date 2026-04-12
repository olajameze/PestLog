import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import { prisma } from '../../../lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

function toAppSubscriptionStatus(status: Stripe.Subscription.Status): string {
  if (status === 'active' || status === 'trialing') {
    return 'active';
  }
  if (status === 'past_due' || status === 'unpaid') {
    return 'past_due';
  }
  if (status === 'canceled' || status === 'incomplete_expired') {
    return 'canceled';
  }
  return 'trial';
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const clientReference = session.client_reference_id;
  if (!clientReference) {
    return;
  }

  const [companyId, plan] = clientReference.split(':');
  if (!companyId) {
    return;
  }

  const stripeCustomerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const nextStatus = 'active';

  const existing = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      trialEndsAt: true,
      plan: true,
    },
  });

  if (!existing) {
    return;
  }

  const shouldUpdateStatus = existing.subscriptionStatus !== nextStatus;
  const shouldSetCustomer = Boolean(stripeCustomerId && existing.stripeCustomerId !== stripeCustomerId);
  const shouldClearTrial = existing.trialEndsAt !== null;
  const shouldUpdatePlan = plan && ['pro', 'business'].includes(plan) && existing.plan !== plan;

  if (!shouldUpdateStatus && !shouldSetCustomer && !shouldClearTrial && !shouldUpdatePlan) {
    return;
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      subscriptionStatus: nextStatus,
      stripeCustomerId: shouldSetCustomer ? stripeCustomerId : existing.stripeCustomerId,
      trialEndsAt: null,
      plan: shouldUpdatePlan ? (plan as 'pro' | 'business') : existing.plan,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const stripeCustomerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

  if (!stripeCustomerId) {
    return;
  }

  const existing = await prisma.company.findUnique({
    where: { stripeCustomerId },
    select: { id: true, subscriptionStatus: true },
  });

  if (!existing || existing.subscriptionStatus === 'canceled') {
    return;
  }

  await prisma.company.update({
    where: { id: existing.id },
    data: { subscriptionStatus: 'canceled' },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const stripeCustomerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
  if (!stripeCustomerId) {
    return;
  }

  const nextStatus = toAppSubscriptionStatus(subscription.status);
  const existing = await prisma.company.findUnique({
    where: { stripeCustomerId },
    select: { id: true, subscriptionStatus: true },
  });

  if (!existing || existing.subscriptionStatus === nextStatus) {
    return;
  }

  await prisma.company.update({
    where: { id: existing.id },
    data: { subscriptionStatus: nextStatus },
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  if (!webhookSecret) {
    return res.status(400).json({ error: 'Missing STRIPE_WEBHOOK_SECRET' });
  }

  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') {
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await buffer(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return res.status(400).json({ error: `Webhook Error: ${(error as Error).message}` });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    } else if (event.type === 'customer.subscription.deleted') {
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
    } else if (event.type === 'customer.subscription.updated') {
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message || 'Webhook processing failed.' });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
