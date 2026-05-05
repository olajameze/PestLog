import { prisma } from '../prisma';

/** Normalized emails for company owner + all technicians (for in-app / push fan-out). */
export async function getCompanyRecipientEmailsNormalized(companyId: string): Promise<string[]> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { email: true, technicians: { select: { email: true } } },
  });
  if (!company) return [];
  const set = new Set<string>();
  set.add(company.email.trim().toLowerCase());
  for (const t of company.technicians) {
    set.add(t.email.trim().toLowerCase());
  }
  return [...set];
}
