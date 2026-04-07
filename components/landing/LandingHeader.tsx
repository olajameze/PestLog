import Link from 'next/link';

export default function LandingHeader() {
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
        <Link
          href="/auth/signin"
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white"
        >
          Sign In
        </Link>
      </div>
    </header>
  );
}
