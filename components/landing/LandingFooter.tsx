import Link from 'next/link';

export default function LandingFooter() {
  return (
    <footer className="bg-navy py-10 text-zinc-300">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-4 text-sm sm:px-6">
        <p>© 2026 PestTrek. All rights reserved.</p>
        <p className="text-slate-400">Support: <a href="mailto:hello@jgdev.co.uk" className="text-white underline">hello@jgdev.co.uk</a></p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link href="/privacy" className="hover:text-white">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-white">
            Terms of Service
          </Link>
          <Link href="/contact" className="hover:text-white">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
}
