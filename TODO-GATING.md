# PestTrek Plan-Based Feature Gating - Backend Phase
Progress: 0/6 ✅

## Backend Steps

### 1. Prisma Schema [PENDING]
- [ ] Add `plan String? @default("trial")` to Company
- [ ] `npx prisma migrate dev --name add_company_plan`
- [ ] `npx prisma generate`

### 2. Create lib/planGuard.ts [PENDING]
- [ ] Export `checkPlan(plan: string|null, allowed: string[]): boolean`

### 3. Update create-checkout-session.ts [PENDING]
- [ ] `client_reference_id: \`${company.id}:${plan}\``

### 4. Update stripe-webhook.ts [PENDING]
- [ ] Parse ref → [companyId, plan]
- [ ] `prisma.company.update({plan})`

### 5. Test APIs [PENDING]
```bash
npm run dev
curl /api/create-checkout-session  # plan param
# Stripe webhook test (ngrok)
```

### 6. Frontend Gating [LATER]
dashboard.tsx conditional rendering

**Rules:** No UI/layout changes - conditional logic only.

**Status:** Backend gating infrastructure

