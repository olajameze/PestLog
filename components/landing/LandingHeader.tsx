import { useState } from 'react';
import Link from 'next/link';

export default function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-3xl font-semibold text-navy">
          PestLog
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-600 md:flex">
          <a href="#features" className="hover:text-navy">Features</a>
          <a href="#pricing" className="hover:text-navy">Pricing</a>
          <a href="#faq" className="hover:text-navy">FAQ</a>
        </nav>
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 md:hidden"
          aria-label="Toggle navigation menu"
          data-state={menuOpen ? 'open' : 'closed'}
        >
          Menu
        </button>
        <Link
          href="/auth/signin"
          className="hidden rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white md:inline-flex"
        >
          Sign In
        </Link>
      </div>
      {menuOpen ? (
        <div className="border-t border-zinc-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2 text-sm font-medium text-zinc-700">
            <a href="#features" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 hover:bg-zinc-100">Features</a>
            <a href="#pricing" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 hover:bg-zinc-100">Pricing</a>
            <a href="#faq" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 hover:bg-zinc-100">FAQ</a>
            <Link href="/auth/signin" onClick={() => setMenuOpen(false)} className="rounded-lg bg-primary-500 px-3 py-2 text-center text-white">
              Sign In
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
