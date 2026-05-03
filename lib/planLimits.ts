export type CompanyPlan = 'trial' | 'pro' | 'business' | 'enterprise' | 'free';

export const TECHNICIAN_LIMITS: Record<CompanyPlan, number | null> = {
  trial: 2,
  free: 2,
  pro: 3,
  business: 10,
  enterprise: null,
};

export function normalizePlan(plan?: string | null): CompanyPlan {
  const value = (plan || 'trial').toLowerCase();
  if (value === 'pro' || value === 'business' || value === 'enterprise' || value === 'free') {
    return value;
  }
  return 'trial';
}

export function getTechnicianLimit(plan?: string | null): number | null {
  return TECHNICIAN_LIMITS[normalizePlan(plan)];
}

export function canAddTechnician(plan: string | null | undefined, currentCount: number): boolean {
  const limit = getTechnicianLimit(plan);
  return limit === null || currentCount < limit;
}

export function formatTechnicianLimit(plan?: string | null): string {
  const limit = getTechnicianLimit(plan);
  if (limit === null) {
    return 'Unlimited technicians';
  }
  return `Up to ${limit} technicians`;
}
