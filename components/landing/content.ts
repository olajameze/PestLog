import { MARKETING_PLAN_FEATURES } from '../../lib/marketingPlanFeatures';

/** Three product stories — each visual once (no duplicate mockups). */
export const featureCards = [
  {
    title: 'Log jobs and proof in the field',
    body: 'Capture treatments, photos, e-signatures, follow-ups, and site notes from any device. Technicians use a streamlined flow; owners see the same record instantly.',
    visual: 'mobile-app-ui',
  },
  {
    title: 'Certificates, reports, and audit evidence',
    body: 'Track qualification expiry alongside job history. Filter and export professional reports so you can answer clients or regulators without rebuilding folders.',
    visual: 'report-preview',
  },
  {
    title: 'One dashboard for operations — and growth on higher tiers',
    body: 'Schedule, compliance gaps, chemical usage, and alerts in one place. Business and Enterprise add customer and retention analytics so you see revenue trends, not only job counts.',
    visual: 'dashboard-view',
  },
];

export const howItWorksSteps = [
  { title: 'Onboard your team', text: 'Add your company details and technicians in minutes.' },
  { title: 'Log jobs on-site', text: 'Technicians use the mobile-friendly web app to record treatments.' },
  { title: 'Stay Compliant', text: 'Generate professional reports for the Rodenticide Stewardship Regime.' },
];

export const pricingPlans = [
  {
    name: '🟢 Pro',
    bestFor: 'Startups & owner-operators scaling beyond a handful of jobs',
    price: '25',
    cadence: '/month',
    features: [...MARKETING_PLAN_FEATURES.pro],
    cta: 'Start Free Trial',
    href: '/auth/signup',
    isPopular: false,
  },
  {
    name: '🟢 Business',
    bestFor: 'Growing teams that need revenue and performance visibility',
    price: '50',
    cadence: '/month',
    features: [...MARKETING_PLAN_FEATURES.business],
    cta: 'Start Free Trial',
    href: '/auth/signup',
    isPopular: true,
  },
  {
    name: '🔵 Enterprise',
    bestFor: 'Larger fleets, multi-site, and stricter governance',
    price: '100',
    cadence: '/month',
    features: [...MARKETING_PLAN_FEATURES.enterprise],
    cta: 'Start Free Trial',
    href: '/auth/signup',
    isPopular: false,
  },
];

/** Shown under hero CTA — avoid repeating the same line again in the hero paragraph. */
export const trustMicrocopy = [
  '7-day free trial',
  'Cancel from the app — no long-term contract',
  'Built for pest control businesses worldwide',
];

export const regulationUrgency = {
  title: 'New compliance standards are changing pest control',
  body: 'With increasing regulatory requirements, pest control businesses are expected to maintain accurate, verifiable records for every job.\n\nPaper logs, spreadsheets, and scattered records are no longer enough.\n\nPestTrace helps you stay compliant, organised, and ready for audits — without the stress.',
};

export const testimonials = [
  {
    quote:
      "PestTrace helped us move from paper logs to fully digital, audit-ready records in under a week. It's saved us hours of admin and made our business far more professional to clients.",
    author: "Weathers' Pest Solutions",
    role: 'Customer Testimonial',
    company: "Weathers' Pest Solutions",
    logo: '/weathers-logo.png',
  },
];

export const landingFaqs = [
  {
    question: 'What happens after my 7-day free trial?',
    answer: "You'll be prompted to enter payment details. No charges until the trial ends.",
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes, you can cancel your subscription from the dashboard. No long-term contracts.',
  },
  {
    question: 'Do I need to download software?',
    answer: 'No, Pest Trace works in the browser and can be installed as a PWA on mobile.',
  },
];
