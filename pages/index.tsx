import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import PWAInstallPrompt from '../components/PWAInstallPrompt';
import { 
  featureCards, 
  pricingPlans, 
  trustMicrocopy, 
  regulationUrgency, 
  testimonials
} from '../components/landing/content';

// --- Animation Helpers ---
const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.6, delay }}
  >
    {children}
  </motion.div>
);

// --- Visual Mockup Components ---
const ProductVisual = ({ type }: { type: string }) => {
  if (type === 'mobile-app-ui') {
    return (
      <div className="relative w-64 h-[450px] bg-slate-900 rounded-[2.5rem] border-[6px] border-slate-800 shadow-2xl overflow-hidden mx-auto">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-800 rounded-b-xl z-10" />
        <div className="p-4 pt-10 bg-white h-full">
          <div className="h-3 w-20 bg-slate-100 rounded mb-4" />
          {[1, 2, 3].map(i => (
            <div key={i} className="p-3 border border-slate-100 rounded-xl mb-2 flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center">
                <div className="w-2 h-2 bg-emerald-600 rounded-full" />
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="h-1.5 w-full bg-slate-100 rounded" />
                <div className="h-1.5 w-2/3 bg-slate-50 rounded" />
              </div>
            </div>
          ))}
          <div className="absolute bottom-4 left-4 right-4 h-10 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-white text-xs">
            Capture Job Details
          </div>
        </div>
      </div>
    );
  }

  if (type === 'dashboard-view') {
    return (
      <div className="w-full aspect-video bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden flex">
        <div className="w-16 bg-slate-50 border-r border-slate-100 p-2 space-y-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="w-full aspect-square bg-slate-200 rounded-lg" />)}
        </div>
        <div className="flex-1 p-4">
          <div className="flex justify-between mb-6">
            <div className="h-4 w-32 bg-slate-100 rounded" />
            <div className="h-4 w-16 bg-emerald-100 rounded" />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-50 border border-slate-100 rounded-lg" />)}
          </div>
          <div className="h-32 bg-slate-50 border border-slate-100 rounded-lg relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-emerald-500/10 flex items-end px-2 gap-1">
              {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-emerald-500 rounded-t-sm" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'report-preview') {
    return (
      <div className="w-full aspect-[1/1.2] bg-white rounded-lg border border-slate-200 shadow-lg p-8 max-w-sm mx-auto">
        <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-center">
          <div className="font-bold text-xs uppercase tracking-widest text-slate-400">Compliance Report</div>
          <div className="h-6 w-6 bg-emerald-500 rounded" />
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="h-2 w-1/3 bg-slate-200 rounded" />
            <div className="h-4 w-full bg-slate-100 rounded" />
          </div>
          <div className="h-24 w-full border border-dashed border-slate-200 rounded-lg flex items-center justify-center italic text-slate-300 text-xs">Photo Evidence</div>
          <div className="pt-8 border-t border-slate-100">
            <div className="h-10 w-32 bg-slate-50 rounded border border-slate-100 flex items-end p-2">
               <div className="w-full h-px bg-slate-300" />
            </div>
            <div className="text-[10px] text-slate-400 mt-2">Technician Signature</div>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      <Head>
        <title>PestTrace – Pest Control Compliance Software UK</title>
        <meta name="description" content="Audit-ready job tracking for UK pest control. Meet CRRU standards, track technicians in real-time, and generate instant reports." />
      </Head>

      <PWAInstallPrompt />

      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <Image 
            src="/pest-trace.png" 
            alt="PestTrace Logo" 
            width={40} 
            height={40} 
            priority
            className="w-10 h-10 object-contain"
          />
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            Pest<span className="text-emerald-600">Trace</span>
          </span>
        </Link>
        <div className="hidden md:flex space-x-10 font-medium text-slate-500">
          <a href="#features" className="hover:text-slate-900 transition">Features</a>
          <a href="#pricing" className="hover:text-slate-900 transition">Pricing</a>
        </div>
        <Link href="/auth/signin" className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-slate-800 transition shadow-sm">
          Log in
        </Link>
      </nav>

      {/* Hero Section */}
      <FadeIn>
        <header className="px-6 pt-20 pb-24 text-center max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 leading-[1.05]">
            Stay audit-ready. <br />
            <span className="text-emerald-600">Eliminate paperwork.</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">
            PestTrace is the compliance and job tracking platform built specifically for UK pest control businesses to meet strict regulations.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/auth/signup" className="bg-emerald-500 text-white px-10 py-5 rounded-2xl font-bold text-xl hover:bg-emerald-600 shadow-xl shadow-emerald-200 transition-all hover:-translate-y-1">
              Start Free Trial
            </Link>
            <button className="bg-slate-50 text-slate-900 px-10 py-5 rounded-2xl font-bold text-xl hover:bg-slate-100 transition">
              See How It Works
            </button>
          </div>
          <div className="mt-8 text-sm text-slate-400 font-medium flex justify-center gap-6">
            {trustMicrocopy.map(item => <span key={item} className="flex items-center gap-1.5"><span className="text-emerald-500">✓</span> {item}</span>)}
          </div>
        </header>
      </FadeIn>

      {/* Urgency Section */}
      <section className="bg-amber-50 border-y border-amber-100 py-16 px-6">
        <FadeIn>
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
              <h2 className="text-3xl font-extrabold text-amber-900 mb-4">{regulationUrgency.title}</h2>
              <p className="text-lg text-amber-800 leading-relaxed opacity-90">{regulationUrgency.body}</p>
            </div>
            <Link 
              href={regulationUrgency.href} 
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap px-8 py-4 bg-amber-900 text-amber-50 rounded-xl font-bold hover:bg-amber-950 transition"
            >
              {regulationUrgency.cta}
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* Features (Alternating Layout) */}
      <section id="features" className="py-32 px-6 space-y-40 max-w-7xl mx-auto">
        {featureCards.map((feature, idx) => (
          <div key={feature.title} className={`flex flex-col md:flex-row items-center gap-16 ${idx % 2 !== 0 ? 'md:flex-row-reverse' : ''}`}>
            <div className="flex-1">
              <FadeIn>
                <h2 className="text-4xl font-bold mb-6 tracking-tight leading-tight">{feature.title}</h2>
                <p className="text-xl text-slate-500 leading-relaxed">{feature.body}</p>
              </FadeIn>
            </div>
            <div className="flex-1 w-full">
              <FadeIn delay={0.2}>
                <ProductVisual type={feature.visual} />
              </FadeIn>
            </div>
          </div>
        ))}
      </section>

      {/* Testimonial */}
      <section className="py-24 px-6">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-xl font-bold text-slate-400 uppercase tracking-widest">
              Trusted by pest control professionals across the UK
            </h2>
          </div>
          <div className="max-w-3xl mx-auto bg-slate-900 rounded-[2.5rem] p-10 md:p-14 text-center text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2" />
            <blockquote className="text-base md:text-lg font-normal mb-8 leading-relaxed italic text-slate-300">
              &ldquo;{testimonials[0].quote}&rdquo;
            </blockquote>
            <div className="flex flex-col items-center justify-center gap-6">
              <a 
                href="https://weatherspestsolutions.co.uk/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:scale-105 transition-transform bg-white p-3 rounded-2xl shadow-lg"
              >
                <Image 
                  src={testimonials[0].logo} 
                  alt={testimonials[0].company} 
                  width={140} 
                  height={50} 
                  className="h-10 w-auto object-contain"
                />
              </a>
              <div className="text-center space-y-1">
                <div className="font-semibold text-white tracking-tight">{testimonials[0].author}</div>
                <div className="text-emerald-500 font-bold text-[10px] uppercase tracking-[0.2em]">{testimonials[0].role}</div>
              </div>
            </div>
          </div>
          <div className="mt-10 text-center">
            <p className="text-slate-500 font-medium italic">
              ⭐ Join early users already switching to digital compliance
            </p>
          </div>
        </FadeIn>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-extrabold mb-4">Simple, fair pricing</h2>
            <p className="text-xl text-slate-500">Scale your pest control business without hidden costs.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {pricingPlans.map((plan) => (
              <FadeIn key={plan.name} delay={plan.isPopular ? 0.1 : 0}>
                <div className={`h-full p-10 rounded-[2rem] bg-white border ${plan.isPopular ? 'border-emerald-500 ring-4 ring-emerald-500/5 relative' : 'border-slate-200'}`}>
                  {plan.isPopular && <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-bold tracking-wide">MOST POPULAR</span>}
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-6"><span className="text-5xl font-black">£{plan.price}</span><span className="text-slate-400 text-sm">{plan.cadence}</span></div>
                  <Link href={plan.href} className={`block text-center py-4 rounded-xl font-bold mb-8 transition ${plan.isPopular ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-100' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}>{plan.cta}</Link>
                  <ul className="space-y-4 text-slate-600 text-sm font-medium">
                    {plan.features.map(f => <li key={f} className="flex gap-3 items-start"><span className="text-emerald-500 text-base">✓</span>{f}</li>)}
                  </ul>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
          <div className="md:col-span-5 space-y-4 text-center md:text-left">
            <div className="text-2xl font-bold">Pest<span className="text-emerald-600">Trace</span></div>
            <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto md:mx-0">
              The UK&apos;s leading digital compliance logbook for pest control professionals. 
              Designed to exceed CRRU stewardship requirements and eliminate paperwork.
            </p>
          </div>

          <div className="md:col-span-4 flex flex-col items-center md:items-start gap-3 text-sm text-slate-400">
            <p>© {new Date().getFullYear()} PestTrace. All rights reserved.</p>
            <p className="text-xs font-medium">
              Created and developed by <a href="https://jgdev.co.uk" target="_blank" rel="noopener noreferrer" className="text-slate-900 underline decoration-emerald-500/30 underline-offset-4 hover:text-emerald-600 transition-colors">jgdev.co.uk</a>
            </p>
          </div>

          <div className="md:col-span-3 flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-4 text-sm font-bold text-slate-600">
            <Link href="/privacy" className="hover:text-emerald-600 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-emerald-600 transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-emerald-600 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}