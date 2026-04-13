# Subscription Updates for Reports Feature

**Status:** Planning → Approved → Implementation

## Requirements:
1. Lock reports behind Pro+ plans for owners & technicians
2. Trial: 14→7 days
3. Post-trial: Force upgrade
4. Prompt ~2 days before trial end

## File Analysis Complete:
- pages/api/create-checkout-session.ts: trial_period_days: 14 → 7
- pages/api/reports.ts: Gate technicians like owners using company.plan
- pages/upgrade.tsx: Update trial text 14→7, enhance prompts
- hooks/useSubscriptionGate.ts: Ensure reports gated
- lib/planGuard.ts: OK (Pro+ already)

## Implementation Steps:
- [x] Create this TODO
- [x] Update checkout trial days (7 days)
- [x] Update reports API gating for techs (Pro+ , trial check)
- [x] Update upgrade page prompts/text (7 days, Pro+ mentions, soon/expired alerts)
- [ ] Add trial expiry prompts to dashboard/nav
- [ ] Test gating/prompts
- [ ] Update TODO.md main progress
