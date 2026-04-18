export const featureCards = [
  {
    title: 'Generate audit-ready reports instantly',
    body: 'Automatically generate detailed compliance reports that meet the specific requirements of UK regulators. No more manual collation at the end of the month.',
    visual: 'report-preview'
  },
  {
    title: 'Never lose proof of work again',
    body: 'Technicians capture high-resolution photos, treatment notes, and digital e-signatures on-site. Everything is synced to the cloud before they even leave the property.',
    visual: 'mobile-app-ui'
  },
  {
    title: 'Track every technician and job in real-time',
    body: 'Instant visibility into your field operations. Monitor chemical usage, track technician efficiency, and see job completion statuses as they happen.',
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
    name: 'Pro',
    bestFor: 'Startups & independent technicians',
    price: '25',
    cadence: '/month per user',
    features: ['Basic compliance logbook', 'Digital job logs', 'Mobile app for technicians', 'Basic reporting'],
    cta: 'Start Free Trial',
    href: '/auth/signup',
    isPopular: false,
  },
  {
    name: 'Business',
    bestFor: 'Small to medium-sized teams',
    price: '40',
    cadence: '/month per user',
    features: ['Advanced reporting & analytics', 'Route optimization', 'Technician performance tracking', 'Customer Lifetime Value (CLV) tracking with CLV/CAC ratio'],
    cta: 'Start Free Trial',
    href: '/auth/signup',
    isPopular: true,
  },
  {
    name: 'Enterprise',
    bestFor: 'Large operations with multi-site management',
    price: 'Contact us',
    cadence: '',
    features: ['All Pro & Business features', 'Custom API access', 'Dedicated account manager', 'Advanced security & compliance', 'Retention & Churn analytics', 'NPS with trend analysis'],
    cta: 'Contact Sales',
    href: '/contact',
    isPopular: false,
  },
];

export const trustMicrocopy = [
  '7-day free trial',
  'No contracts',
  'Cancel anytime'
];

export const regulationUrgency = {
  title: 'Is your business ready for June 2025?',
  body: 'The UK Rodenticide Stewardship Regime (CRRU) update in June 2025 requires stricter proof of treatment competency and point-of-sale verification. PestTrace ensures your records are permanent, accurate, and 100% compliant.',
  cta: 'View Compliance Guide',
  href: "https://www.knw.co.uk/understanding-the-new-uk-rodenticide-legislation/#:~:text=As%20of%201%20January%202025,courses%20consistent%20with%20CRRU's%20requirements."
};

export const testimonials = [
  {
    quote: "PestTrace transformed how we handle audits. What used to take hours of paperwork now happens automatically in the background.",
    author: "Weathers' Pest Solutions",
    role: "Operations Director",
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
