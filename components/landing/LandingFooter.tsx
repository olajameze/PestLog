import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="bg-navy border-t border-slate-800 py-12 text-slate-300">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:grid-cols-12 sm:px-6">
        <div className="sm:col-span-4">
          <p className="text-xl font-semibold text-white">Pest Trace</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
            A modern pest control compliance platform for technicians, managers, and teams.
          </p>
        </div>

        <div className="sm:col-span-4">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Quick links</p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-slate-300">
            <Link href="/privacy" className="transition hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition hover:text-white">
              Terms of Service
            </Link>
            <Link href="/contact" className="transition hover:text-white">
              Contact
            </Link>
          </div>
        </div>

        <div className="sm:col-span-4">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Contact</p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <p>
              Support: <a href="mailto:hello@pesttrace.com" className="text-white underline">hello@pesttrace.com</a>
            </p>
            <p>
              Created by <a href="https://jgdev.co.uk" target="_blank" rel="noreferrer" className="text-white underline">jgdev.co.uk</a>
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 flex w-full max-w-6xl flex-col gap-4 border-t border-slate-800 px-4 pt-6 text-sm text-slate-500 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Pest Trace. All rights reserved.</p>
        <p>Made for pest control teams and compliance reporting.</p>
      </div>
    </footer>
  );
}
