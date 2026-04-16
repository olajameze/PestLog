# Pest Trace Go-Live Checklist

**Project**: Pest Trace MVP  
**Target Domain**: pesttrace.com  
**Status**: Ready for Staging/Production  
**Last Updated**: January 2025

---

## Pre-Launch: 2 Weeks Before

### Product Setup

- [ ] **Stripe Product Created**
  - Name: "Pest Trace Monthly"
  - Price: £35.00 GBP
  - Billing: Monthly (recurring)
  - Trial: 14 days
  - Webhook endpoint registered: `https://pesttrace.com/api/webhooks/stripe`

- [ ] **Domain Registered**
  - Domain: pesttrace.com
  - Registrar: _____________
  - DNS provider: _____________
  - Auto-renewal enabled: Yes / No

- [ ] **SSL Certificate**
  - Auto-generated via Vercel: Yes
  - Manual certificate: _____________

### Team Access (Production)

- [ ] **Vercel Account Created**
  - Owner email: _____________
  - Backup admin: _____________

- [ ] **Supabase Admin Access**
  - Email: _____________
  - 2FA enabled: Yes / No

- [ ] **Stripe Dashboard Access**
  - Admin email: _____________
  - 2FA enabled: Yes / No

- [ ] **GitHub Repository**
  - Public/Private: _______________
  - Branch protection enabled: Yes / No
  - Require PR reviews: Yes / No

---

## Pre-Launch: 1 Week Before

### Testing Environment (Staging)

- [ ] **Staging Deployment Created**
  - URL: staging.pesttrace.com or pesttrace-staging.vercel.app
  - Environment: All variables copied from prod (except with Stripe test keys)
  - Database: Separate staging database created

- [ ] **Full UAT Performed**
  - Signup flow tested with real email
  - Stripe test payment processed (test card: 4242 4242 4242 4242)
  - Technician logbook entry created
  - Photo upload verified
  - Reports generated and downloaded
  - Offline mode tested (DevTools → Network → Offline)

- [ ] **Lighthouse Audit Run**
  - Performance: _____ / 100
  - Accessibility: _____ / 100
  - Best Practices: _____ / 100
  - SEO: _____ / 100
  - PWA: _____ / 100 ✅ (Target ≥ 90)

- [ ] **Security Review**
  - All secrets in environment variables (no hardcoding)
  - CORS properly configured
  - SQL injection prevention (via Prisma)
  - XSS protection (via React/Next.js)
  - CSRF tokens present (if applicable)

- [ ] **Load Testing (Optional)**
  - Tool: _____________
  - Concurrent users tested: _____________
  - Response time at 100 users: _____ ms
  - No errors at sustained load: Yes / No

---

## Launch Day: Production Deployment

### Final Checks (30 min before launch)

- [ ] **Code Freeze**
  - All features merged and tested
  - Last commit hash: _____________

- [ ] **Database Backup Created**
  - Command: `npx prisma db seed` (if applicable)
  - Backup location: _____________
  - Backup timestamp: _____________

- [ ] **Environment Variables Verified**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` ✓
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✓
  - [ ] `DATABASE_URL` ✓
  - [ ] `STRIPE_SECRET_KEY` ✓
  - [ ] `STRIPE_WEBHOOK_SECRET` ✓
  - [ ] `NEXTAUTH_URL` = https://pesttrace.com ✓
  - [ ] `NODE_ENV` = production ✓
  - [ ] Production environment variables are configured in Vercel/hosting ✓

- [ ] **DNS Propagation Checked**
  - Command: `nslookup pesttrace.com`
  - Resolves to: 76.76.19.0 (Vercel IP)
  - Propagation time: _____ minutes

### Deployment Steps (15 min)

```bash
# Step 1: Final build verification
npm run build  # ✓ No errors

# Step 2: Run migrations (if needed)
DATABASE_URL="[production-url]" npx prisma migrate deploy

# Step 3: Deploy to production
vercel --prod

# Step 4: Verify deployment URL
# Expected: https://pesttrace.com or default Vercel URL
```

Deployment completed at: _____________  
Vercel Build ID: _____________  
Commit hash deployed: _____________

### Post-Deployment Smoke Test (10 min)

- [ ] **Site Loads**
  - `https://pesttrace.com` returns 200 OK
  - Landing page displays correctly
  - No console errors in DevTools

- [ ] **Auth Works**
  - Sign up: Test with `test@example.com`
  - Verify email received: Yes / No
  - Sign in successful: Yes / No
  - Session persists after refresh: Yes / No

- [ ] **Payment Flow**
  - Click "Upgrade to Pro"
  - Stripe checkout loads
  - Test card charged (Stripe test mode): Yes / No
  - Subscription active in dashboard: Yes / No

- [ ] **Core Features**
  - Technician can log in: Yes / No
  - Technician can add logbook entry: Yes / No
  - Photo upload works: Yes / No
  - Owner can view reports: Yes / No
  - Report export (PDF) works: Yes / No

- [ ] **Offline Capability**
  - DevTools → Network → Offline
  - Offline fallback page displays: Yes / No
  - Service worker loaded: Yes / No
  - PWA install prompt appears (mobile): Yes / Yes / No

- [ ] **Error Handling**
  - Try invalid login: Error displays gracefully
  - Try network failure: Offline page or error toast shown
  - Check browser console: No critical errors

---

## Post-Launch: First 24 Hours

### Monitoring

- [ ] **Error Tracking Set Up**
  - Sentry configured (or similar error service)
  - Alerts configured for critical errors
  - Check for new errors: _____________

- [ ] **Analytics Verified**
  - Google Analytics loaded (if configured)
  - Vercel Web Analytics accessible
  - Initial traffic: _____ page views

- [ ] **Logs Checked**
  - Command: `vercel logs --prod`
  - No 5xx errors: Yes / No
  - Database connections healthy: Yes / No
  - Stripe webhook processing: Yes / No

- [ ] **Performance Baseline Recorded**
  - First Contentful Paint (FCP): _____ ms
  - Largest Contentful Paint (LCP): _____ ms
  - Cumulative Layout Shift (CLS): _____
  - Time to Interactive (TTI): _____ ms

- [ ] **Uptime Monitoring Started**
  - Service: _____________ (e.g., UptimeRobot, Pingdom)
  - Endpoint: https://pesttrace.com
  - Check interval: Every 5 minutes
  - Alert email: _____________

### Communication

- [ ] **Announcement Sent**
  - Channels: Email / Slack / Social / Website
  - Message includes: Product link, login page, support contact
  - Sent at: _____________

- [ ] **User Onboarding**
  - First test user email: _____________
  - Received welcome email: Yes / No
  - Successfully signed up: Yes / No

- [ ] **Support Channels Active**
  - Email support: _____________
  - Help documentation URL: _____________
  - Support ticket system: _____________

---

## Post-Launch: Week 1

### Stability Check

- [ ] **No Critical Errors**
  - Error rate < 0.1%: Yes / No
  - Automatic alerts: No false positives
  - Manual review of logs: All clear

- [ ] **Performance Maintained**
  - Response time < 500ms: Yes / No
  - Database query time < 200ms: Yes / No
  - No memory leaks: Yes / No

- [ ] **Payments Processing Correctly**
  - Stripe webhooks executing: Yes / No
  - Subscription status updates: Yes / No
  - No failed transactions: Yes / No

- [ ] **Database Healthy**
  - Backup completed: Yes / No
  - Query performance acceptable: Yes / No
  - Storage usage reasonable: _____ MB

### User Feedback

- [ ] **Support Tickets Reviewed**
  - Number of tickets: _____________
  - Common issues: _____________
  - Critical issues: _____________
  - Resolution rate: _____ %

- [ ] **Early User Feedback Collected**
  - Feedback channels: Email / Surveys / Interviews
  - Key insights: _____________
  - Bugs reported: _____________

---

## Post-Launch: Month 1

### Long-Term Monitoring

- [ ] **Performance Degradation Check**
  - Compare week 1 vs. week 4 metrics
  - Page load time: Week 1: _____ ms → Week 4: _____ ms
  - Database performance: No degradation: Yes / No

- [ ] **Scalability Assessed**
  - Current active users: _____________
  - Projected growth (3 months): _____________
  - Scaling plan in place: Yes / No

- [ ] **Security Audit**
  - Penetration testing scheduled: Yes / No
  - Dependency vulnerabilities checked: Yes / No
  - Secrets rotation schedule: _____________

- [ ] **Feature Metrics**
  - Signup conversion rate: _____ %
  - Trial-to-paid conversion: _____ %
  - Feature usage stats: _____________
  - User retention: _____ %

---

## Ongoing Maintenance

### Weekly Tasks

- [ ] Review error logs (Monday morning)
- [ ] Check uptime status (dashboard)
- [ ] Monitor Stripe webhook delivery
- [ ] Verify database backups completed

### Monthly Tasks

- [ ] Review performance metrics
- [ ] Update dependencies (`npm audit`)
- [ ] Security review of recent changes
- [ ] User feedback sync with team

### Quarterly Tasks

- [ ] Penetration testing
- [ ] Load testing
- [ ] Cost analysis (Vercel, Supabase, Stripe)
- [ ] Product roadmap review

---

## Contacts & Escalation

| Role | Name | Email | Phone |
|------|------|-------|-------|
| **Project Owner** | _____________ | _____________ | _____________ |
| **Tech Lead** | _____________ | _____________ | _____________ |
| **DevOps** | _____________ | _____________ | _____________ |
| **Support Manager** | _____________ | _____________ | _____________ |
| **Stripe Support** | — | support@stripe.com | +1 (888) 252-0695 |
| **Vercel Support** | — | support@vercel.com | — |

---

## Sign-Off

- [ ] **Ready to Deploy**
  - Product Manager: _____________ (Date: _______)
  - Tech Lead: _____________ (Date: _______)
  - QA Lead: _____________ (Date: _______)

- [ ] **Launch Approved**
  - Project Owner: _____________ (Date: _______)

- [ ] **Go-Live Completed**
  - Deployment Date: _____________________
  - Launch Time: _____________________
  - Deployed By: _____________________
  - All checks passed: Yes / No

---

## Notes & Action Items

```
[Use this section for additional notes, blockers, or follow-up items]



```

---

**Last Reviewed**: ______________  
**Next Review**: ______________
