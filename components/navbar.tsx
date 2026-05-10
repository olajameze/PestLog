import { useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Button from './ui/Button';

interface NavbarProps {
  user?: { name: string; email: string };
  onSignOut?: () => void;
  logo?: ReactNode;
}

export default function Navbar({
  user,
  onSignOut,
  logo = (
    <div className="flex items-center gap-3">
      <Image src="/pest-trace.png" alt="Pest Trace logo" width={32} height={32} className="h-8 w-auto object-contain" />
      <span className="text-xl font-bold text-navy">Pest Trace</span>
    </div>
  ),
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const isActive = (path: string) => router.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex min-w-0 items-center">
            <Link href="/" className="flex min-w-0 items-center gap-3 text-2xl font-bold text-navy hover:text-primary-600 transition-colors">
              {logo}
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {user ? (
              <>
                <Link href="/dashboard" className={`px-3 py-2 rounded-lg font-medium transition-colors ${isActive('/dashboard') ? 'text-primary-600 bg-primary-50' : 'text-zinc-600 hover:text-navy hover:bg-zinc-100'}`}>
                  Dashboard
                </Link>
                <Link href="/reports" className={`px-3 py-2 rounded-lg font-medium transition-colors ${isActive('/reports') ? 'text-primary-600 bg-primary-50' : 'text-zinc-600 hover:text-navy hover:bg-zinc-100'}`}>
                  Reports
                </Link>
                <span className="text-sm text-zinc-500">Hi, {user.name}</span>
                <Button variant="secondary" size="sm" onClick={onSignOut}>
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="text-zinc-600 hover:text-navy font-medium transition-colors">
                  Sign In
                </Link>
                <Link href="/auth/signup">
                  <Button variant="primary">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center shrink-0">
            <Button variant="secondary" size="sm" onClick={() => setMobileOpen(!mobileOpen)}>
              <span className="text-xl">☰</span>
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-zinc-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {user ? (
                <>
                  <Link href="/dashboard" className={`block px-3 py-2 rounded-md font-medium ${isActive('/dashboard') ? 'bg-primary-50 text-primary-600' : 'text-zinc-600 hover:bg-zinc-100 hover:text-navy'}`}>
                    Dashboard
                  </Link>
                  <Link href="/reports" className={`block px-3 py-2 rounded-md font-medium ${isActive('/reports') ? 'bg-primary-50 text-primary-600' : 'text-zinc-600 hover:bg-zinc-100 hover:text-navy'}`}>
                    Reports
                  </Link>
                  <Button variant="secondary" className="mt-2" onClick={onSignOut}>
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/auth/signin" className="block px-3 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-navy rounded-md font-medium">
                    Sign In
                  </Link>
                  <Link href="/auth/signup">
                    <Button variant="primary" className="mt-2">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

