import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  queueOperation, 
  getPendingQueue, 
  markSynced, 
  getQueueStats 
} from '../lib/offline/db';
import { useSession } from '@supabase/auth-helpers-react'; // If available, else use custom session hook

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueStats, setQueueStats] = useState({ pending: 0, syncing: 0 });
  const session = useSession(); // Replace with your session hook

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const checkStats = async () => {
      const stats = await getQueueStats();
      setQueueStats(stats);
    };
    checkStats();
    const interval = setInterval(checkStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const queueMutation = async (
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    tableName: string,
    data: Record<string, any>
  ) => {
    if (isOnline && session?.user?.id) {
      // Try online first
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession?.user?.id) throw new Error('No session');
        
        // Direct Supabase/Prisma call via API
        const res = await fetch(`/api/${tableName}`, {
          method: operation !== 'DELETE' ? 'POST' : 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentSession.access_token}`,
          },
          body: JSON.stringify({ operation, data }),
        });
        
        if (res.ok) {
          return await res.json();
        } else {
          throw new Error('Online mutation failed');
        }
      } catch {
        // Fallback to queue
        if (session?.user?.id) {
          await queueOperation(session.user.id, operation, tableName, data);
        }
        throw new Error('Queued offline');
      }
    } else if (session?.user?.id) {
      await queueOperation(session.user.id, operation, tableName, data);
      throw new Error('Queued offline');
    }
  };

  const syncQueue = async () => {
    if (!isOnline || !session?.user?.id) return;
    
    const pending = await getPendingQueue();
    for (const item of pending) {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const res = await fetch('/api/offline/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentSession.access_token}`,
          },
          body: JSON.stringify(item),
        });
        
        if (res.ok) {
          await markSynced(item.id);
        }
      } catch (error) {
        console.warn('Sync failed for item', item.id, error);
      }
    }
  };

  useEffect(() => {
    if (isOnline) {
      syncQueue();
    }
  }, [isOnline]);

  return {
    isOnline,
    queueStats,
    queueMutation,
    syncQueue,
  };
}

// Custom hook for logbook/chemical forms
export function useOfflineMutation(
  tableName: string
) {
  const { queueMutation } = useOfflineQueue();
  
  const mutate = async (operation: 'CREATE' | 'UPDATE' | 'DELETE', data: Record<string, any>) => {
    return queueMutation(operation, tableName, data);
  };

  return mutate;
}

