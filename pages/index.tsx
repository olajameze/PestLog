/* eslint-disable react/no-unescaped-entities */
import Link from 'next/link';

export default function Home() {
  const features = [
    {
      icon: '📋',
      title: 'Digital Logbooks',
      description: 'Replace paper logbooks with secure, cloud-based digital records that sync automatically.',
    },
    {
      icon: '📸',
      title: 'Photo & Signature Capture',
      description: 'Capture photos, signatures, and service details directly from your technicians in the field.',
    },
    {
      icon: '✅',
      title: 'Compliance Ready',
      description: 'Meet regulatory requirements with automated compliance reporting and audit trails.',
    },
    {
      icon: '👥',
      title: 'Team Management',
      description: 'Manage technicians, assign jobs, track performance, and view team activity in real-time.',
    },
    {
      icon: '📊',
      title: 'Advanced Reporting',
      description: 'Generate detailed compliance reports and insights to show clients and auditors.',
    },
    {
      icon: '💳',
      title: 'Flexible Billing',
      description: 'Choose your subscription plan and upgrade or downgrade based on your needs.',
    },
  ];

  const pricingPlans = [
    {
      name: 'Starter',
      price: '$29',
      period: '/month',
      description: 'Perfect for small teams',
      features: [
        'Up to 5 technicians',
        'Unlimited logbook entries',
        'Photo capture',
        'Basic reporting',
        'Email support',
        '30-day data retention',
      ],
      cta: 'Start Trial',
      highlighted: false,
    },
    {
      name: 'Professional',
      price: '$79',
      period: '/month',
      description: 'For growing businesses',
      features: [
        'Up to 25 technicians',
        'Unlimited logbook entries',
        'Photo & signature capture',
        'Compliance reports (RSR, audit trails)',
        'Technician certification tracking',
        'Priority email & chat support',
        '1-year data retention',
        'Custom branding',
        'API access (beta)',
        'Mobile app access',
      ],
      cta: 'Start Trial',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'pricing',
      description: 'For large organizations',
      features: [
        'Unlimited technicians',
        'Unlimited logbook entries',
        'Custom integrations',
        'Dedicated account manager',
        'Phone & priority support',
        'Unlimited data retention',
        'Advanced compliance auditing',
        'Custom user roles & permissions',
        'Real-time analytics dashboard',
        'Team training & onboarding',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  const faqs = [
    {
      question: 'What is PestLog?',
      answer: 'PestLog is a digital compliance logbook SaaS designed specifically for pest control businesses. It replaces paper logbooks and helps you manage service records, technician data, and regulatory compliance all in one secure cloud-based platform.',
    },
    {
      question: 'Do I need a credit card to start the free trial?',
      answer: 'No! We offer a 14-day free trial with no credit card required. You can explore all features and decide if PestLog is right for your business risk-free.',
    },
    {
      question: 'How many technicians can I add?',
      answer: 'The number of technicians depends on your plan. Starter allows up to 5, Professional up to 25, and Enterprise has unlimited technicians. You can upgrade or downgrade your plan anytime.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes, absolutely. We use enterprise-grade encryption, secure cloud hosting with Supabase, and comply with industry security standards. Your data is backed up regularly and you have full control over who can access it.',
    },
    {
      question: 'Can technicians access PestLog from the field?',
      answer: 'Yes! PestLog is mobile-responsive and works on any device with a browser. Technicians can log entries, capture photos, and add signatures directly from their phones or tablets in the field.',
    },
    {
      question: 'What kind of reports can I generate?',
      answer: 'PestLog provides comprehensive compliance reports, technician performance analytics, service history, audit trails, and custom reports. You can export data and share compliance documentation with clients and auditors easily.',
    },
    {
      question: 'Can I import my existing data?',
      answer: 'Yes, we offer data import assistance. Contact our support team at hello@jgdev.org and we\'ll help you migrate your existing logbook data to PestLog.',
    },
    {
      question: 'What if I need to cancel my subscription?',
      answer: 'You can cancel anytime from your account settings. There are no long-term contracts or cancellation fees. We only charge for the time you have used.',
    },
  ];

  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null);

  return (
    <div className="bg-white dark:bg-black">
      {/* Header/Navigation */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            🐛 PestLog
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <a href="#features" className="hover:text-black dark:hover:text-white transition">Features</a>
            <a href="#how-it-works" className="hover:text-black dark:hover:text-white transition">How It Works</a>
            <a href="#pricing" className="hover:text-black dark:hover:text-white transition">Pricing</a>
            <a href="#security" className="hover:text-black dark:hover:text-white transition">Security</a>
            <a href="#about" className="hover:text-black dark:hover:text-white transition">About</a>
            <a href="#faq" className="hover:text-black dark:hover:text-white transition">FAQ</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-black dark:text-white leading-tight mb-6">
              Digital Logbooks for Pest Control Professionals
            </h1>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
              PestLog is a modern compliance logbook SaaS designed specifically for pest control businesses. 
              Replace paper records, streamline operations, and stay compliant with ease.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link href="/auth/signup" className="btn btn-primary btn-lg text-center">
                Start Free Trial
              </Link>
              <Link href="/auth/signin" className="btn btn-secondary btn-lg text-center">
                Sign In
              </Link>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">
              14-day free trial. No credit card required.
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-2xl p-8 flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-zinc-600 dark:text-zinc-400">Digital Logbook Management</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-zinc-50 dark:bg-zinc-900 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-black dark:text-white mb-4">
              Powerful Features for Your Business
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Everything you need to manage compliance logbooks and keep your pest control business running smoothly.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-white dark:bg-zinc-800 rounded-xl p-8 border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-black dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-black dark:text-white mb-4">
            How PestLog Works
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Get started in minutes and start digitalizing your pest control operations.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">1</span>
            </div>
            <h3 className="text-xl font-semibold text-black dark:text-white mb-3">
              Sign Up & Setup
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Create your account, add your company details, and invite your technicians in minutes.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">2</span>
            </div>
            <h3 className="text-xl font-semibold text-black dark:text-white mb-3">
              Add Service Entries
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Your technicians log service details, photos, and signatures directly from the mobile app.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">3</span>
            </div>
            <h3 className="text-xl font-semibold text-black dark:text-white mb-3">
              Generate Reports
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              View compliance reports, analytics, and audit trails whenever you need them.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-zinc-50 dark:bg-zinc-900 py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-black dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Choose the perfect plan for your pest control business. Always upgrade or downgrade with no penalties.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, idx) => (
              <div
                key={idx}
                className={`rounded-xl p-8 border transition ${
                  plan.highlighted
                    ? 'border-blue-500 bg-white dark:bg-zinc-800 shadow-xl scale-105 md:scale-100'
                    : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800'
                }`}
              >
                {plan.highlighted && (
                  <div className="mb-4 inline-block bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </div>
                )}
                <h3 className="text-2xl font-bold text-black dark:text-white mb-2">
                  {plan.name}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                  {plan.description}
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-black dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {' '}{plan.period}
                  </span>
                </div>
                <Link
                  href="/auth/signup"
                  className={`btn ${plan.highlighted ? 'btn-primary' : 'btn-secondary'} btn-lg w-full text-center mb-8`}
                >
                  {plan.cta}
                </Link>
                <ul className="space-y-4">
                  {plan.features.map((feature, featureIdx) => (
                    <li key={featureIdx} className="flex items-start gap-3">
                      <span className="text-green-600 dark:text-green-400 flex-shrink-0">✓</span>
                      <span className="text-zinc-700 dark:text-zinc-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-black dark:text-white mb-6">
              About PestLog
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
              PestLog was founded by pest control industry veterans who understood the pain of managing compliance 
              logbooks manually. We saw businesses struggling with paper records, compliance violations, and 
              inefficient operations.
            </p>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
              Our mission is simple: empower pest control professionals with modern, user-friendly tools that save 
              time, reduce compliance risks, and help them focus on their core business.
            </p>
            <div className="grid grid-cols-3 gap-4 mt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">14</div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Day Free Trial</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">100%</div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">UK Compliant</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">24/7</div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Support</p>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900 p-6 rounded-xl">
              <h3 className="font-semibold text-black dark:text-white mb-2">Our Vision</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                To become the industry standard for digital compliance management in pest control businesses worldwide.
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900 p-6 rounded-xl">
              <h3 className="font-semibold text-black dark:text-white mb-2">Our Values</h3>
              <ul className="text-zinc-600 dark:text-zinc-400 space-y-2">
                <li>✓ <strong>Simplicity:</strong> Easy to use for everyone</li>
                <li>✓ <strong>Reliability:</strong> Enterprise-grade infrastructure</li>
                <li>✓ <strong>Support:</strong> Responsive, helpful team</li>
              </ul>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900 p-6 rounded-xl">
              <h3 className="font-semibold text-black dark:text-white mb-2">Our Commitment</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                We are committed to continuously improving PestLog based on customer feedback and industry needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="bg-zinc-50 dark:bg-zinc-900 py-16 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-black dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Have questions? We have got answers. Can't find what you're looking for? <Link href="mailto:hello@jgdev.org" className="text-blue-600 dark:text-blue-400 hover:underline">Contact us</Link>.
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-700 transition text-left"
                >
                  <h3 className="font-semibold text-black dark:text-white">
                    {faq.question}
                  </h3>
                  <span className={`text-blue-600 dark:text-blue-400 transition transform ${expandedFaq === idx ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {expandedFaq === idx && (
                  <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-700 border-t border-zinc-200 dark:border-zinc-600">
                    <p className="text-zinc-600 dark:text-zinc-400">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-blue-600 dark:bg-blue-900 text-white py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                Why Choose PestLog?
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-4">
                  <span className="text-2xl">✓</span>
                  <span>Save time on paperwork and administrative tasks</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-2xl">✓</span>
                  <span>Keep all compliance records in one secure location</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-2xl">✓</span>
                  <span>Track technician productivity and performance</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-2xl">✓</span>
                  <span>Reduce compliance violations and audit issues</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-2xl">✓</span>
                  <span>Impress clients with professional documentation</span>
                </li>
              </ul>
            </div>
            <div className="bg-blue-700 dark:bg-blue-800 rounded-xl p-8 flex flex-col justify-center">
              <h3 className="text-2xl font-bold mb-4">14-Day Free Trial</h3>
              <p className="text-blue-100 mb-6">
                Try all features risk-free. No credit card required to get started.
              </p>
              <Link href="/auth/signup" className="btn btn-primary bg-white text-blue-600 hover:bg-zinc-100 text-center">
                Start Your Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Compliance Section */}
      <section id="security" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-black dark:text-white mb-4">
            Security & Compliance
          </h2>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Built to help UK pest control businesses meet the Rodenticide Stewardship Regime (RSR) requirements 
            and other regulatory compliance standards.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold text-black dark:text-white mb-3">
              Enterprise Security
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              End-to-end encryption, secure authentication, and industry-standard infrastructure via Supabase.
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition">
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-black dark:text-white mb-3">
              RSR Compliant
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Digital records meet UK Rodenticide Stewardship Regime requirements with audit-ready reporting.
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition">
            <div className="text-4xl mb-4">🕐</div>
            <h3 className="text-xl font-semibold text-black dark:text-white mb-3">
              Offline First PWA
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Works offline in the field. Install as an app and sync automatically when connection returns.
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-black dark:text-white mb-3">
              Audit Trail
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Complete record of who logged what and when. Proof of compliance for auditors and regulators.
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition">
            <div className="text-4xl mb-4">🔄</div>
            <h3 className="text-xl font-semibold text-black dark:text-white mb-3">
              Data Backup & Recovery
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Automatic daily backups. Your compliance records are always safe and recoverable.
            </p>
          </div>
          <div className="bg-white dark:bg-zinc-800 rounded-xl p-6 border border-zinc-200 dark:border-zinc-700 hover:shadow-lg transition">
            <div className="text-4xl mb-4">⚙️</div>
            <h3 className="text-xl font-semibold text-black dark:text-white mb-3">
              Certification Tracking
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">
              Monitor technician certifications expiries and get alerts for renewals.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-black dark:text-white mb-6">
          Ready to Digitalize Your Pest Control Business?
        </h2>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-8">
          Join pest control professionals who have already transformed their operations with PestLog.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/signup" className="btn btn-primary btn-lg">
            Get Started Free
          </Link>
          <Link href="/auth/signin" className="btn btn-secondary btn-lg">
            Sign In to Your Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold text-black dark:text-white mb-4">
                🐛 PestLog
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Digital logbooks for pest control professionals.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-black dark:text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li><Link href="#features" className="hover:text-black dark:hover:text-white">Features</Link></li>
                <li><Link href="#how-it-works" className="hover:text-black dark:hover:text-white">How It Works</Link></li>
                <li><Link href="#pricing" className="hover:text-black dark:hover:text-white">Pricing</Link></li>
                <li><Link href="#security" className="hover:text-black dark:hover:text-white">Security</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-black dark:text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li><Link href="#about" className="hover:text-black dark:hover:text-white">About</Link></li>
                <li><Link href="#faq" className="hover:text-black dark:hover:text-white">FAQ</Link></li>
                <li><Link href="mailto:hello@jgdev.org" className="hover:text-black dark:hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-black dark:text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li><Link href="#" className="hover:text-black dark:hover:text-white">Privacy</Link></li>
                <li><Link href="#" className="hover:text-black dark:hover:text-white">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-8 text-center text-sm text-zinc-600 dark:text-zinc-400">
            <p>&copy; 2026 PestLog. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React from 'react';