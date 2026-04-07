import { useState } from 'react';
import Link from 'next/link';
import Button from './ui/Button';

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onSignOut?: () => void;
}

export default function Sidebar({ activeTab = 'technicians', onTabChange, onSignOut }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const tabs = [
    { id: 'technicians', label: 'Dashboard', href: '/dashboard?tab=technicians' },
    { id: 'logbook', label: 'Logbook', href: '/dashboard?tab=logbook' },
    { id: 'reports', label: 'Reports', href: '/reports' },
    { id: 'settings', label: 'Settings', href: '/dashboard?tab=settings' },
  ];

  const isActive = (id: string) => activeTab === id;

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg lg:hidden"
      >
        ☰
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-zinc-200 bg-white transform transition-transform lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:static`}
      >
        <div className="flex flex-col h-full">
          <div className="border-b border-zinc-200 px-5 py-5">
            <h2 className="text-3xl font-semibold text-navy">PestLog</h2>
            <p className="mt-1 text-sm text-zinc-500">Compliance Suite</p>
            <button
              onClick={() => setMobileOpen(false)}
              className="mt-3 rounded-lg p-2 hover:bg-zinc-100 lg:hidden"
            >
              ✕
            </button>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {tabs.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={() => {
                  onTabChange?.(tab.id);
                  setMobileOpen(false);
                }}
                className={`block rounded-lg px-4 py-3 text-base font-medium transition ${
                  isActive(tab.id)
                    ? 'bg-primary-500 text-white'
                    : 'text-zinc-700 hover:bg-zinc-100 hover:text-navy'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-zinc-200 p-4">
            <Button variant="danger" fullWidth onClick={onSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

