import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { prisma } from '../../../lib/prisma';
import { logger } from '../../../lib/logger';
import { sendSubscriptionUpgradeEmail } from '../subscription';

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

const getWebhookSecret = () => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || secret.includes('whsec_...')) {
    throw new Error('STRIPE_WEBHOOK_SECRET is missing or using a placeholder.');
  }
  return secret;
};

/**
 * Helper to read the raw body from the request.
 * Required for Stripe signature verification when bodyParser is disabled.
 */
async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  let webhookSecret: string;
  try {
    webhookSecret = getWebhookSecret();
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : String(err)}`);
  }

  const sig = req.headers['stripe-signature'] as string;
  if (!sig) return res.status(400).send('Webhook Error: Missing stripe-signature header.');

  let event: Stripe.Event;

  const stripe = (() => {
    try {
      return getStripe();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return message;
    }
  })();
  if (typeof stripe === 'string') {
    logger.error(`Stripe initialization error in webhook: ${stripe}`);
    return res.status(500).json({ error: 'Internal server error' });
  }

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`Webhook signature verification failed: ${errorMessage}`);
    return res.status(400).send(`Webhook Error: ${errorMessage}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const stripeCustomerId = session.customer as string;
        const clientReferenceId = session.client_reference_id;

        // client_reference_id was set in create-checkout-session.ts as "companyId:plan"
        if (clientReferenceId) {
          const [companyId, plan] = clientReferenceId.split(':');
          // Ensure plan is one of the valid types, defaulting to 'pro' if not recognized
          const validPlans = ['free', 'pro', 'business', 'enterprise'] as const;
          const resolvedPlan = validPlans.find(p => p === plan) ?? 'pro';

          await prisma.company.update({
            where: { id: companyId },
            data: {
              stripeCustomerId,
              plan: resolvedPlan,
              subscriptionStatus: 'active',
              // Force clear trial dates upon successful checkout completion
              trialEndsAt: null,
            },
          });
          
          // Trigger the upgrade notification email defined in pages/api/subscription.ts
          await sendSubscriptionUpgradeEmail(companyId, resolvedPlan);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;
        const status = subscription.status;
        const plan = subscription.metadata.plan;

        const validPlans = ['pro', 'business', 'enterprise'] as const;
        const resolvedPlan = validPlans.find(p => p === plan);

        await prisma.company.update({
          where: { stripeCustomerId },
          data: {
            subscriptionStatus: status,
            ...(resolvedPlan && { plan: resolvedPlan }),
            // If Stripe says the sub is active, we MUST clear our local trial restriction
            ...(status === 'active' && { trialEndsAt: null }),
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;

        await prisma.company.update({
          where: { stripeCustomerId },
          data: {
            subscriptionStatus: 'canceled',
          },
        });
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`Webhook processing failed: ${errorMessage}`);
    return res.status(500).json({ error: 'Internal server error processing webhook' });
  }
}