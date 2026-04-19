# Pest Trace Improvements - Implementation TODO

## Phase 1: Critical ✅ In Progress
- [x] Create TODO.md  
- [x] 1. Mobile responsiveness: Audit/enhance dashboard/reports/technician/settings ✅ COMPLETE
- [x] 2. Offline capability: IndexedDB queue + SW sync + API ✅ COMPLETE
  - [x] lib/offline/db.ts (IndexedDB)
  - [x] hooks/useOfflineQueue.ts  
  - [x] pages/api/offline/sync.ts
  - [x] components/offline/OfflineBanner.tsx
  - [x] Enhanced public/sw.js
- [ ] 3. Onboarding tour: components/onboarding/OnboardingTour.tsx + integrate dashboard
- [ ] 4. Global error/loading: components/ui/Skeleton.tsx, ErrorBoundary.tsx + enhance Toast

## Phase 2: Important
- [ ] Prisma schema updates + migration (profiles, audit_logs, chemical_logs, etc.)
- [ ] RBAC: profiles.role + hooks/usePermissions.ts + RoleGuard.tsx
- [ ] Audit trail: audit_logs + lib/audit/log.ts
- [ ] Global search: pages/api/search.ts + UI
- [ ] Enhanced export: PDF/Excel APIs

## Phase 3: Nice-to-have
- [ ] Realtime alerts: Supabase Realtime + hooks/useRealtimeAlerts.ts
- [ ] Dark mode: Tailwind config
- [ ] Calendar sync: .ics export
- [ ] Public compliance page

**Progress: 1/25 steps complete**
**Next: Mobile responsiveness audit + fixes**
