import { useState } from 'react';
import Link from 'next/link';

export default function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur transition-shadow duration-200 hover:shadow-sm">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-3xl font-semibold text-navy transition-colors hover:text-primary-600">
          Pest Trace
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-600 md:flex">
          <a href="#features" className="rounded-md px-2 py-1 transition-colors hover:bg-zinc-100 hover:text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">Features</a>
          <a href="#pricing" className="rounded-md px-2 py-1 transition-colors hover:bg-zinc-100 hover:text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">Pricing</a>
          <a href="#faq" className="rounded-md px-2 py-1 transition-colors hover:bg-zinc-100 hover:text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">FAQ</a>
        </nav>
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 md:hidden"
          aria-label="Toggle navigation menu"
          data-state={menuOpen ? 'open' : 'closed'}
        >
          Menu
        </button>
        <Link
          href="/auth/signin"
          className="hidden rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 md:inline-flex"
        >
          Sign In
        </Link>
      </div>
      {menuOpen ? (
        <div className="border-t border-zinc-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            <a href="#features" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 transition hover:bg-zinc-100">Features</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 transition hover:bg-zinc-100">Pricing</a>
            <a href="#faq" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 transition hover:bg-zinc-100">FAQ</a>
            <Link href="/auth/signin" onClick={() => setMenuOpen(false)} className="rounded-lg bg-primary-500 px-3 py-2 text-center text-white transition hover:bg-primary-600">
              Sign In
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
