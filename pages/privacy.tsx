import Link from 'next/link';
import Navbar from '../components/navbar';
import LandingFooter from '../components/landing/LandingFooter';
import { getClientSupportEmail } from '../lib/supportEmail';

export default function PrivacyPage() {
  const supportAddr = getClientSupportEmail();
  return (
    <div className="min-h-screen bg-offwhite">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          <h1 className="text-4xl font-bold text-navy">Privacy Policy</h1>
          <p className="mt-4 text-slate-600">This privacy policy explains how Pest Trace collects, uses, and protects your information while delivering pest control compliance tools.</p>

          <section className="mt-10 space-y-5 text-slate-700">
            <div>
              <h2 className="text-2xl font-semibold text-navy">1. Data we collect</h2>
              <p className="mt-3 leading-7">
                We collect the information you provide when you create an account, manage technicians, log jobs, or contact support. This includes email address, company name, plan details, and job records.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-navy">2. How we use your data</h2>
              <p className="mt-3 leading-7">
                We use your data to authenticate you, deliver the Pest Trace service, process subscriptions, send support replies, and improve product features such as reporting and analytics.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-navy">3. Third-party services</h2>
              <p className="mt-3 leading-7">
                Pest Trace uses Supabase for authentication and data storage, Stripe for billing, and Resend for support email delivery. These providers process your data only to support the service.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-navy">4. Security</h2>
              <p className="mt-3 leading-7">
                We protect your data with secure authentication and encryption provided by our service providers. We do not sell your personal information.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-navy">5. Data retention</h2>
              <p className="mt-3 leading-7">
                We retain data as long as needed to provide the service and support your account. If you delete your account, we remove your information according to our data retention practices.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-navy">6. Contact</h2>
              <p className="mt-3 leading-7">
                If you have privacy questions, email{' '}
                <a href={`mailto:${supportAddr}`} className="text-primary-600 hover:text-primary-700">
                  {supportAddr}
                </a>{' '}
                or submit a message through our <Link href="/contact" className="text-primary-600 hover:text-primary-700">contact page</Link>.
              </p>
            </div>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
