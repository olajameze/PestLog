import Sidebar from '../sidebar';

interface AppLayoutProps {
  activeTab: 'technicians' | 'logbook' | 'reports' | 'settings';
  onTabChange?: (tab: string) => void;
  onSignOut?: () => void;
  children: React.ReactNode;
}

export default function AppLayout({ activeTab, onTabChange, onSignOut, children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={onTabChange} onSignOut={onSignOut} />
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8 lg:pl-8 overflow-y-auto">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
