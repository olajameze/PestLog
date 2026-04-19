import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { prisma } from '../../../lib/prisma';
import { logger } from '../../../lib/logger';
import { sendSubscriptionUpgradeEmail } from '../subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

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

  const sig = req.headers['stripe-signature'] as string;
  if (!sig || !webhookSecret) {
    return res.status(400).send('Webhook Error: Missing signature or secret configuration.');
  }

  let event: Stripe.Event;

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
          await prisma.company.update({
            where: { id: companyId },
            data: {
              stripeCustomerId,
              plan: plan || 'pro',
              subscriptionStatus: 'active',
              trialEndsAt: null, // User has converted to a paid plan
            },
          });
          
          // Trigger the upgrade notification email defined in pages/api/subscription.ts
          await sendSubscriptionUpgradeEmail(companyId, plan || 'pro');
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = subscription.customer as string;
        const status = subscription.status;
        const plan = subscription.metadata.plan;

        await prisma.company.update({
          where: { stripeCustomerId },
          data: {
            subscriptionStatus: status,
            ...(plan && { plan }),
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