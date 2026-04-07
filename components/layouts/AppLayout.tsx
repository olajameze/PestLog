import Sidebar from '../sidebar';

interface AppLayoutProps {
  activeTab: 'technicians' | 'logbook' | 'reports' | 'settings';
  onTabChange?: (tab: string) => void;
  onSignOut?: () => void;
  children: React.ReactNode;
}

export default function AppLayout({ activeTab, onTabChange, onSignOut, children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-offwhite">
      <div className="flex">
        <Sidebar activeTab={activeTab} onTabChange={onTabChange} onSignOut={onSignOut} />
        <main className="min-w-0 flex-1 p-6 lg:p-10 lg:pl-8">{children}</main>
      </div>
    </div>
  );
}
