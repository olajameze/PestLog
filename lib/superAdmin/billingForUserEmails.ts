import { prisma } from '../prisma';
import { normalizeAuthEmail } from '../auth/userSession';

export type UserBillingRow = {
  billingCompanyName: string | null;
  billingPlan: string | null;
  billingSubscriptionStatus: string | null;
  billingTrialEndsAt: string | null;
  billingPeriodEndAt: string | null;
  billingCancelAtPeriodEnd: boolean | null;
};

const companyBillingSelect = {
  name: true,
  email: true,
  plan: true,
  subscriptionStatus: true,
  trialEndsAt: true,
  subscriptionPeriodEndAt: true,
  subscriptionCancelAtPeriodEnd: true,
} as const;

type CompanyBillingShape = {
  name: string | null;
  email: string;
  plan: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: Date | null;
  subscriptionPeriodEndAt: Date | null;
  subscriptionCancelAtPeriodEnd: boolean | null;
};

function rowFromCompany(c: CompanyBillingShape): UserBillingRow {
  return {
    billingCompanyName: c.name ?? null,
    billingPlan: c.plan ?? null,
    billingSubscriptionStatus: c.subscriptionStatus ?? null,
    billingTrialEndsAt: c.trialEndsAt?.toISOString() ?? null,
    billingPeriodEndAt: c.subscriptionPeriodEndAt?.toISOString() ?? null,
    billingCancelAtPeriodEnd: c.subscriptionCancelAtPeriodEnd ?? null,
  };
}

export const emptyBillingRow = (): UserBillingRow => ({
  billingCompanyName: null,
  billingPlan: null,
  billingSubscriptionStatus: null,
  billingTrialEndsAt: null,
  billingPeriodEndAt: null,
  billingCancelAtPeriodEnd: null,
});

/**
 * Maps normalized auth emails to subscription data from Company (business admin / owner email)
 * or, when absent, from the Technician's company for technician accounts.
 */
export async function billingRowsByNormalizedEmail(emails: string[]): Promise<Map<string, UserBillingRow>> {
  const unique = [...new Set(emails.map((e) => normalizeAuthEmail(e)).filter((e) => e.length > 0))];
  const out = new Map<string, UserBillingRow>();
  if (unique.length === 0) return out;

  const [companies, technicians] = await Promise.all([
    prisma.company.findMany({
      where: { email: { in: unique } },
      select: companyBillingSelect,
    }),
    prisma.technician.findMany({
      where: {
        OR: unique.map((email) => ({ email: { equals: email, mode: 'insensitive' as const } })),
      },
      select: {
        email: true,
        company: { select: companyBillingSelect },
      },
    }),
  ]);

  for (const c of companies) {
    out.set(normalizeAuthEmail(c.email), rowFromCompany(c));
  }
  for (const t of technicians) {
    const key = normalizeAuthEmail(t.email);
    if (!out.has(key) && t.company) {
      out.set(key, rowFromCompany(t.company));
    }
  }

  return out;
}

export function mergeUserBilling<T extends { email: string }>(
  user: T,
  map: Map<string, UserBillingRow>,
): T & UserBillingRow {
  const row = map.get(normalizeAuthEmail(user.email)) ?? emptyBillingRow();
  return { ...user, ...row };
}
