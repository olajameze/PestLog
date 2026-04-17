import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="bg-navy border-t border-slate-800 py-8 text-slate-300">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 text-sm sm:grid-cols-12 sm:px-6">
        <div className="sm:col-span-4">
          <p className="text-lg font-semibold text-white">Pest Trace</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
            A modern pest control compliance platform for technicians and teams.
          </p>
        </div>

        <div className="sm:col-span-4">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Quick links</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-slate-300">
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
          <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Contact</p>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <p>
              Support: <a href="mailto:pesttrace@gmail.com" className="text-white underline">pesttrace@gmail.com</a>
            </p>
            <p>
              Created by <a href="https://jgdev.co.uk" target="_blank" rel="noreferrer" className="text-white underline">jgdev.co.uk</a>
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-6xl flex-col gap-3 border-t border-slate-800 px-4 pt-5 text-xs text-slate-500 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Pest Trace. All rights reserved.</p>
        <p>Compliance reporting designed for pest control teams.</p>
      </div>
    </footer>
  );
}
