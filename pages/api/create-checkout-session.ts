import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

type Plan = 'pro' | 'business';

const PRICE_IDS: Record<Plan, string> = {
  // Replace these with your Stripe Dashboard Price IDs.
  pro: 'price_1TJsS6C3CXyzwZzXmqVCJy86',
  business: 'price_1TJsSfC3CXyzwZzX4liw2ahT',
};

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
  if (error || !user?.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { plan } = req.body as { plan?: Plan };
  if (!plan || !(plan in PRICE_IDS)) {
    return res.status(400).json({ error: 'Invalid plan. Use "pro" or "business".' });
  }

  const selectedPlan = plan as Plan;
  const priceId = PRICE_IDS[selectedPlan];

  // Resolve company for owner or technician account.
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

  if (!company) {
    return res.status(400).json({ error: 'No company found' });
  }

  try {
    let stripeCustomerId = company.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: company.name ?? undefined,
        metadata: { companyId: company.id },
      });
      stripeCustomerId = customer.id;
      await prisma.company.update({
        where: { id: company.id },
        data: { stripeCustomerId },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
    const requestOrigin =
      typeof req.headers.origin === 'string' && req.headers.origin.trim().length > 0
        ? req.headers.origin
        : undefined;
    const origin = appUrl || vercelUrl || requestOrigin || 'https://pest-trek.vercel.app';

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        metadata: {
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
    res.status(500).json({ error: (error as Error).message || 'Unable to create checkout session.' });
  }
}