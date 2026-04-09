export function checkPlan(companyPlan: string | null, allowedPlans: string[]): boolean {
  const effectivePlan = companyPlan || 'trial';
  return allowedPlans.includes(effectivePlan);
}

// Usage example:
/*
const company = await prisma.company.findUnique(...);
if (!checkPlan(company?.plan, ['pro', 'business', 'enterprise'])) {
  throw new Error('Upgrade required');
}
*/

