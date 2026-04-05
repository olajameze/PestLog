import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Button from './ui/Button';

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onSignOut?: () => void;
}

export default function Sidebar({ activeTab = 'technicians', onTabChange, onSignOut }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const tabs = [
    { id: 'technicians', label: '👥 Technicians', href: '/dashboard?tab=technicians' },
    { id: 'logbook', label: '📝 Logbook', href: '/dashboard?tab=logbook' },
    { id: 'reports', label: '📊 Reports', href: '/reports' },
    { id: 'settings', label: '⚙️ Settings', href: '/dashboard?tab=settings' },
  ];

  const isActive = (id: string) => activeTab === id;

  return (
    <>
      {/* Mobile Toggle */}
      <button 
        onClick={() => setMobileOpen(true)}
        className="lg:hidden p-4 fixed top-4 left-4 z-50 bg-white rounded-xl shadow-lg"
      >
        ☰
      </button>

      {/* Sidebar Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transform transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:static`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-zinc-200">
            <h2 className="text-2xl font-bold text-navy">PestLog</h2>
            <button 
              onClick={() => setMobileOpen(false)}
              className="lg:hidden mt-4 p-2 rounded-lg hover:bg-zinc-100"
            >
              ✕
            </button>
          </div>

          <nav className="flex-1 p-6 space-y-2">
            {tabs.map((tab) => (
              <Link 
                key={tab.id}
                href={tab.href}
                onClick={() => {
                  onTabChange?.(tab.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl font-medium transition-all ${
                  isActive(tab.id)
                    ? 'bg-primary-500 text-white shadow-lg'
                    : 'text-zinc-700 hover:bg-zinc-100 hover:text-navy hover:shadow-md'
                }`}
              >
                <span className="text-xl">{tab.label.split(' ')[0]}</span>
                <span>{tab.label.split(' ').slice(1).join(' ')}</span>
              </Link>
            ))}
          </nav>

          <div className="p-6 border-t border-zinc-200">
            <Button 
              variant="danger" 
              fullWidth
              onClick={onSignOut}
              className="hover-lift"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

