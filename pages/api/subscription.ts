import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { sendUpgradeNotificationEmail } from '../../lib/email';
import { normalizeAuthEmail } from '../../lib/auth/userSession';
import { technicianEmailWhere } from '../../lib/auth/technicianGate';
import { reconcileCompanyBillingFromStripe } from '../../lib/stripe/reconcileCompanyBilling';

/** Called from the Stripe webhook when checkout activates a paid plan for a company. */
export async function sendSubscriptionUpgradeEmail(companyId: string, plan: string): Promise<void> {
  const row = await prisma.company.findUnique({
    where: { id: companyId },
    select: { email: true },
  });
  if (!row?.email) return;
  try {
    await sendUpgradeNotificationEmail(row.email, plan);
  } catch (error) {
    console.error('Subscription upgrade email failed:', error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  if (!user.email) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const authEmail = normalizeAuthEmail(user.email);

    // Get company and return subscription status directly from Company model
    const subscriptionSelect = {
      id: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      paymentGraceEndsAt: true,
      paymentFailedAt: true,
      stripeCustomerId: true,
      plan: true,
      subscriptionPeriodEndAt: true,
      subscriptionCancelAtPeriodEnd: true,
    };

    let company = await prisma.company.findUnique({
      where: { email: authEmail },
      select: subscriptionSelect,
    });

    if (!company) {
      const technician = await prisma.technician.findFirst({
        where: technicianEmailWhere(authEmail),
        include: {
          company: {
            select: subscriptionSelect,
          },
        },
      });

      if (!technician || !technician.company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      company = technician.company;
    }

    if (company.stripeCustomerId?.trim()) {
      try {
        await reconcileCompanyBillingFromStripe(company.id);
      } catch (e) {
        console.warn('[subscription] Stripe reconcile skipped:', e instanceof Error ? e.message : e);
      }
      const latest = await prisma.company.findUnique({
        where: { id: company.id },
        select: subscriptionSelect,
      });
      if (latest) company = latest;
    }

    return res.status(200).json({
      status: company.subscriptionStatus,
      trialEndsAt: company.trialEndsAt,
      paymentGraceEndsAt: company.paymentGraceEndsAt,
      paymentFailedAt: company.paymentFailedAt,
      stripeCustomerId: company.stripeCustomerId,
      plan: company.plan,
      subscriptionPeriodEndAt: company.subscriptionPeriodEndAt,
      subscriptionCancelAtPeriodEnd: Boolean(company.subscriptionCancelAtPeriodEnd),
    });
  } else {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}