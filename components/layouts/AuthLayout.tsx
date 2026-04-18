import Link from 'next/link';

export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-offwhite">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-3xl font-semibold text-navy">
            Pest Trace
          </Link>
          <Link
            href="/auth/signin"
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white"
          >
            Sign In
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-14 sm:px-6">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-navy mb-4">{title}</h1>
          <div className="mx-auto h-1 w-20 bg-primary-500 rounded-full mb-6"></div>
          <p className="text-xl text-zinc-600">{subtitle}</p>
        </div>
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">{children}</div>
        <Link href="/" className="mt-8 text-sm text-zinc-600 transition hover:text-navy">
          ← Back to home
        </Link>
      </main>
    </div>
  );
}
