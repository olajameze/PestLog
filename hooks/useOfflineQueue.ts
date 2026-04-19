import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  queueOperation, 
  getPendingQueue, 
  markSynced, 
  getQueueStats 
} from '../lib/offline/db';

type OfflineOperation = 'CREATE' | 'UPDATE' | 'DELETE';

type QueuePayload = {
  id: string;
  userId: string;
  operation: OfflineOperation;
  tableName: string;
  data: Record<string, unknown>;
  createdAt: number;
  syncedAt?: number;
  retryCount: number;
};

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [queueStats, setQueueStats] = useState({ pending: 0, syncing: 0 });
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.session?.user.id ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
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
    operation: OfflineOperation,
    tableName: string,
    data: Record<string, unknown>
  ) => {
    if (isOnline && userId) {
      // Try online first
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession?.user?.id) throw new Error('No session');
        
        // Send to sync endpoint (server decides how to apply)
        const res = await fetch('/api/offline/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentSession.access_token}`,
          },
          body: JSON.stringify({ operation, tableName, data }),
        });
        
        if (res.ok) {
          return await res.json();
        } else {
          throw new Error('Online mutation failed');
        }
      } catch {
        // Fallback to queue
        if (userId) {
          await queueOperation(userId, operation, tableName, data);
        }
        throw new Error('Queued offline');
      }
    } else if (userId) {
      await queueOperation(userId, operation, tableName, data);
      throw new Error('Queued offline');
    }
  };

  const syncQueue = async () => {
    if (!isOnline || !userId) return;
    
    const pending = await getPendingQueue();
    for (const item of pending) {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!currentSession?.access_token) continue;
        const res = await fetch('/api/offline/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${currentSession.access_token}`,
          },
          body: JSON.stringify(item satisfies QueuePayload),
        });
        
        if (res.ok) {
          await markSynced(item.id);
        }
      } catch {
        // Best-effort; leave queued for retry.
      }
    }
  };

  useEffect(() => {
    if (isOnline) {
      syncQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, userId]);

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
  
  const mutate = async (operation: OfflineOperation, data: Record<string, unknown>) => {
    return queueMutation(operation, tableName, data);
  };

  return mutate;
}

