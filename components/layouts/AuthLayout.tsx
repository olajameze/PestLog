import Link from 'next/link';
import Image from 'next/image';

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
        <div className="mx-auto flex min-h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Link href="/auth/signin" className="flex items-center gap-2 text-2xl font-semibold text-navy sm:text-3xl">
            <Image
              src="/pest-trace.png"
              alt="Pest Trace logo"
              width={34}
              height={34}
              className="h-8 w-8 object-contain sm:h-9 sm:w-9"
              priority
            />
            <span>Pest Trace</span>
          </Link>
          <Link
            href="/auth/signin"
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white sm:px-4"
          >
            Sign In
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl min-w-0 flex-col items-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-10 min-w-0 text-center sm:mb-12">
          <h1 className="break-words text-3xl font-bold text-navy sm:text-5xl mb-4">{title}</h1>
          <div className="mx-auto h-1 w-20 bg-primary-500 rounded-full mb-6"></div>
          <p className="break-words text-base text-zinc-600 sm:text-xl">{subtitle}</p>
        </div>
        <div className="w-full max-w-md min-w-0 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">{children}</div>
        <Link href="/home" className="mt-8 text-sm text-zinc-600 transition hover:text-navy">
          ← Product information
        </Link>
      </main>
    </div>
  );
}
