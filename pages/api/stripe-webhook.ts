import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { prisma } from '../../lib/prisma';
import { sendSubscriptionUpgradeEmail } from './subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return res.status(400).json({ error: 'Missing STRIPE_WEBHOOK_SECRET' });
  }

  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') {
    console.error('Missing Stripe signature');
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    console.log(`Webhook received: ${event.type}`);
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const clientReference = session.client_reference_id;

      console.log('Client reference:', clientReference);

      if (!clientReference) {
        console.error('Missing client_reference_id');
        return res.status(400).json({ error: 'Missing client_reference_id' });
      }

      const [companyId, plan] = clientReference.split(':');
      console.log(`Company ID: ${companyId}, Plan: ${plan}`);

      if (!companyId || !plan) {
        console.error('Invalid client_reference_id format');
        return res.status(400).json({ error: 'Invalid client_reference_id format' });
      }

      // Update the company record
      const updatedCompany = await prisma.company.update({
        where: { id: companyId },
        data: {
          subscriptionStatus: 'active',
          plan: plan as 'pro' | 'business',
          stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
          trialEndsAt: null,
        },
        select: { id: true, plan: true },
      });
      console.log(`Company updated: ${updatedCompany.id}, plan: ${updatedCompany.plan}`);
      if (plan === 'pro' || plan === 'business') {
        await sendSubscriptionUpgradeEmail(companyId, plan);
      }
    } 
    else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
      if (stripeCustomerId) {
        await prisma.company.update({
          where: { stripeCustomerId },
          data: { subscriptionStatus: 'canceled' },
        });
        console.log(`Subscription canceled for customer: ${stripeCustomerId}`);
      }
    }
    else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;
      if (stripeCustomerId) {
        const newStatus = (subscription.status === 'active' || subscription.status === 'trialing') ? 'active' : 'past_due';
        await prisma.company.update({
          where: { stripeCustomerId },
          data: { subscriptionStatus: newStatus },
        });
        console.log(`Subscription updated for customer: ${stripeCustomerId}, status: ${newStatus}`);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Webhook processing error:', err);
    return res.status(400).json({ error: err.message || 'Webhook processing failed.' });
  }
}