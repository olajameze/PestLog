export const featureCards = [
  {
    title: 'Log jobs in real-time',
    body: 'Capture every job on-site with full details, photos, and timestamps.',
    visual: 'report-preview'
  },
  {
    title: 'Store certifications securely',
    body: 'Keep technician qualifications organised and accessible at all times.',
    visual: 'mobile-app-ui'
  },
  {
    title: 'Capture proof of work',
    body: 'Collect photos and e-signatures instantly for complete job verification.',
    visual: 'dashboard-view'
  },
  {
    title: 'Generate audit-ready reports',
    body: 'Create professional reports in seconds — ready when you need them.',
    visual: 'report-preview'
  },
  {
    title: 'Track performance and activity',
    body: 'Monitor technicians, jobs, and business performance in one dashboard.',
    visual: 'dashboard-view'
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
    bestFor: 'Startups & independent technicians',
    price: '25',
    cadence: '/month',
    features: ['Up to 3 technicians', 'Everything you already include'],
    cta: 'Start Free Trial',
    href: '/auth/signup',
    isPopular: false,
  },
  {
    name: '🟢 Business',
    bestFor: 'Small to medium-sized teams',
    price: '40',
    cadence: '/month',
    features: ['Up to 10 technicians', 'Advanced features'],
    cta: 'Start Free Trial',
    href: '/auth/signup',
    isPopular: true,
  },
  {
    name: '🔵 Enterprise',
    bestFor: 'Large operations with multi-site management',
    price: '340',
    cadence: '/month',
    features: ['Unlimited technicians', 'All Pro and Business capabilities', 'Dedicated account manager', 'Advanced security & compliance'],
    cta: 'Start Free Trial',
    href: '/auth/signup',
    isPopular: false,
  },
];

export const trustMicrocopy = [
  '7-day free trial',
  'No contracts',
  'Built for UK compliance',
];

export const regulationUrgency = {
  title: 'New compliance standards are changing pest control',
  body: 'With increasing regulatory requirements, pest control businesses are expected to maintain accurate, verifiable records for every job.\n\nPaper logs, spreadsheets, and scattered records are no longer enough.\n\nPestTrace helps you stay compliant, organised, and ready for audits — without the stress.',
};

export const testimonials = [
  {
    quote: "PestTrace helped us move from paper logs to fully digital, audit-ready records in under a week. It's saved us hours of admin and made our business far more professional to clients.",
    author: "Weathers' Pest Solutions",
    role: 'Customer Testimonial',
    company: "Weathers' Pest Solutions",
    logo: "/weathers-logo.png"
  }
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
