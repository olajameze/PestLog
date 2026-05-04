import { useOfflineQueue } from '../../hooks/useOfflineQueue';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/router';

export default function OfflineBanner() {
  const router = useRouter();
  const { isOnline, queueStats } = useOfflineQueue();
  const hiddenRoutes =
    router.pathname === '/home' ||
    router.pathname.startsWith('/auth') ||
    router.pathname === '/contact' ||
    router.pathname === '/privacy' ||
    router.pathname === '/terms' ||
    router.pathname === '/maintenance';

  if (hiddenRoutes) return null;
  if (isOnline && queueStats.pending === 0 && queueStats.syncing === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`fixed top-16 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-md rounded-2xl shadow-2xl mx-4 transition-all duration-300 ${
      isOnline 
        ? 'bg-emerald-500 border-emerald-400 border-2' 
        : 'bg-amber-500 border-amber-400 border-2'
      }`}
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="font-medium text-white text-sm">
                Syncing {Math.max(queueStats.syncing, queueStats.pending)} item(s)...
              </span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span className="font-medium text-white text-sm">Offline mode - {queueStats.pending} queued</span>
            </>
          )}
        </div>
        {queueStats.pending > 0 && (
          <button 
            onClick={() => window.location.reload()} 
            className="text-white/80 hover:text-white text-xs font-medium underline"
            aria-label="Refresh page to retry synchronization"
          >
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}

