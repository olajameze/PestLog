import Link from 'next/link';
import { featureCards, howItWorksSteps, pricingPlans } from './content';

export default function LandingMain() {
  return (
    <>
      <section className="bg-offwhite px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto w-full max-w-7xl text-center">
          <h1 className="mx-auto max-w-5xl text-4xl font-bold leading-tight text-navy sm:text-5xl lg:text-6xl">
            Prove Compliance, Log Jobs, and Win More Contracts
          </h1>
          <p className="mx-auto mt-6 max-w-4xl text-base leading-relaxed text-zinc-600 sm:text-lg lg:text-xl">
            The digital compliance logbook for pest control professionals. Meet UK regulations (Rodenticide Stewardship Regime), log jobs on-site, and generate audit-ready reports.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/auth/signup" className="btn btn-primary btn-lg min-w-48">
              Start Free Trial
            </Link>
            <a href="#features" className="btn btn-secondary btn-lg min-w-48">
              View Demo
            </a>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-10 sm:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-5">
          <span className="rounded-full border border-primary-200 bg-primary-50 px-4 py-1 text-sm font-semibold text-primary-700">
            Trusted by 50+ pest control businesses
          </span>
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {['Logo 1', 'Logo 2', 'Logo 3', 'Logo 4'].map((logo) => (
              <div key={logo} className="rounded-xl border border-zinc-200 bg-offwhite px-4 py-3 text-center text-sm font-medium text-zinc-500">
                {logo}
              </div>
            ))}
          </div>
          <p className="max-w-3xl text-center text-sm text-zinc-600">
            &quot;PestLog helped us move from paper logs to audit-ready records in under a week.&quot;
          </p>
        </div>
      </section>

      <section id="features" className="bg-offwhite px-4 py-16 sm:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-navy sm:text-4xl">Key Features</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {featureCards.map((item) => (
              <article key={item.title} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h3 className="text-2xl font-semibold text-navy">{item.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-zinc-600">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <h2 className="text-center text-3xl font-bold text-navy sm:text-4xl">How It Works</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorksSteps.map((step, index) => (
              <article key={step} className="rounded-2xl border border-zinc-200 bg-offwhite p-5">
                <p className="text-sm font-semibold text-primary-600">Step {index + 1}</p>
                <p className="mt-2 text-base font-medium text-navy">{step}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="bg-offwhite px-4 py-16 sm:px-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-navy sm:text-4xl">Pricing</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <article key={plan.name} className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <span className="inline-flex w-fit rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
                  14-day free trial
                </span>
                <h3 className="mt-4 text-2xl font-bold text-navy">{plan.name}</h3>
                <p className="mt-1 text-sm text-zinc-600">Best for: {plan.bestFor}</p>
                <div className="mt-5">
                  <p className="text-4xl font-bold text-navy">{plan.price}</p>
                  {plan.cadence ? <p className="text-sm text-zinc-600">{plan.cadence}</p> : null}
                </div>
                <ul className="mt-5 space-y-2 text-sm text-zinc-700">
                  {plan.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
                <Link href={plan.href} className="btn btn-primary btn-lg mt-6 w-full text-center">
                  {plan.cta}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16 sm:px-6">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-zinc-200 bg-offwhite p-8 text-center sm:p-10">
          <h2 className="text-3xl font-bold text-navy sm:text-4xl">Ready to simplify compliance and grow your business?</h2>
          <p className="mt-3 text-base text-zinc-600 sm:text-lg">Join 50+ pest control companies using PestLog.</p>
          <Link href="/auth/signup" className="btn btn-primary btn-lg mt-6">
            Start Your Free Trial
          </Link>
        </div>
      </section>
    </>
  );
}
