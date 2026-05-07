import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';
import { prisma } from '../../lib/prisma';
import { sendUpgradeNotificationEmail } from '../../lib/email';
import { normalizeAuthEmail } from '../../lib/auth/userSession';
import { technicianEmailWhere } from '../../lib/auth/technicianGate';
import { reconcileCompanyBillingFromStripe } from '../../lib/stripe/reconcileCompanyBilling';
import { logger } from '../../lib/logger';

const subscriptionSelectCore = {
  id: true,
  subscriptionStatus: true,
  trialEndsAt: true,
  paymentGraceEndsAt: true,
  paymentFailedAt: true,
  stripeCustomerId: true,
  plan: true,
} as const;

const subscriptionSelectExtended = {
  ...subscriptionSelectCore,
  subscriptionPeriodEndAt: true,
  subscriptionCancelAtPeriodEnd: true,
} as const;

type SubscriptionCompanyPayload = {
  id: string;
  subscriptionStatus: string | null;
  trialEndsAt: Date | null;
  paymentGraceEndsAt: Date | null;
  paymentFailedAt: Date | null;
  stripeCustomerId: string | null;
  plan: string | null;
  subscriptionPeriodEndAt: Date | null;
  subscriptionCancelAtPeriodEnd: boolean;
};

async function resolveCompanyForSubscription(
  authEmail: string,
  useExtendedColumns: boolean,
): Promise<SubscriptionCompanyPayload | null> {
  const sel = useExtendedColumns ? subscriptionSelectExtended : subscriptionSelectCore;

  let row = await prisma.company.findUnique({
    where: { email: authEmail },
    select: sel,
  });

  if (!row) {
    const technician = await prisma.technician.findFirst({
      where: technicianEmailWhere(authEmail),
      include: {
        company: { select: sel },
      },
    });
    if (!technician?.company) return null;
    row = technician.company;
  }

  const ext = row as typeof row & {
    subscriptionPeriodEndAt?: Date | null;
    subscriptionCancelAtPeriodEnd?: boolean | null;
  };

  return {
    id: row.id,
    subscriptionStatus: row.subscriptionStatus,
    trialEndsAt: row.trialEndsAt,
    paymentGraceEndsAt: row.paymentGraceEndsAt,
    paymentFailedAt: row.paymentFailedAt,
    stripeCustomerId: row.stripeCustomerId,
    plan: row.plan,
    subscriptionPeriodEndAt: useExtendedColumns ? (ext.subscriptionPeriodEndAt ?? null) : null,
    subscriptionCancelAtPeriodEnd: useExtendedColumns ? Boolean(ext.subscriptionCancelAtPeriodEnd) : false,
  };
}

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

    let company: SubscriptionCompanyPayload | null = null;
    try {
      company = await resolveCompanyForSubscription(authEmail, true);
    } catch (e) {
      logger.warn(
        `[subscription] billing extension columns missing — run db:sync-company-columns. ${e instanceof Error ? e.message : e}`,
      );
      try {
        company = await resolveCompanyForSubscription(authEmail, false);
      } catch (inner) {
        logger.error(`[subscription] core query failed: ${inner instanceof Error ? inner.message : inner}`);
        return res.status(500).json({
          error: 'Unable to load subscription.',
          hint: 'Confirm DATABASE_URL and that Company tables match prisma/schema (run db:sync-company-columns).',
        });
      }
    }

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (company.stripeCustomerId?.trim()) {
      try {
        await reconcileCompanyBillingFromStripe(company.id);
      } catch (e) {
        console.warn('[subscription] Stripe reconcile skipped:', e instanceof Error ? e.message : e);
      }
      try {
        const latest = await resolveCompanyForSubscription(authEmail, true);
        if (latest) company = latest;
      } catch {
        const latest = await resolveCompanyForSubscription(authEmail, false);
        if (latest) company = latest;
      }
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
