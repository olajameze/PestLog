import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineQueueItem {
  id: string;
  userId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  tableName: string;
  data: Record<string, unknown>;
  createdAt: number;
  syncedAt?: number;
  retryCount: number;
}

interface OfflineDB extends DBSchema {
  queue: {
    key: string;
    value: OfflineQueueItem;
  };
}

const DB_NAME = 'pesttrace-offline';
const DB_VERSION = 2;

function createQueueId(): string {
  const maybeCrypto = (globalThis as unknown as { crypto?: Crypto }).crypto;
  const uuid = maybeCrypto?.randomUUID?.();
  if (uuid) return uuid;
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function getDB(): Promise<IDBPDatabase<OfflineDB>> {
  return openDB<OfflineDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('queue', { keyPath: 'id' });
        return;
      }
    },
  });
}

export async function queueOperation(
  userId: string,
  operation: OfflineQueueItem['operation'],
  tableName: string,
  data: Record<string, unknown>
): Promise<void> {
  const db = await getDB();
  const item: OfflineQueueItem = {
    id: createQueueId(),
    userId,
    operation,
    tableName,
    data,
    createdAt: Date.now(),
    retryCount: 0,
  };
  await db.put('queue', item);
}

export async function getPendingQueue(): Promise<OfflineQueueItem[]> {
  const db = await getDB();
  const all = await db.getAll('queue');
  return all.filter((item) => item.syncedAt == null);
}

export async function markSynced(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('queue', 'readwrite');
  const item = await tx.store.get(id);
  if (item) {
    item.syncedAt = Date.now();
    await tx.store.put(item);
  }
  await tx.done;
}

export async function getQueueStats(): Promise<{
  pending: number;
  syncing: number;
}> {
  const db = await getDB();
  const all = await db.getAll('queue');
  const pending = all.filter((item) => item.syncedAt == null).length;
  return { pending, syncing: 0 };
}

export async function clearQueue(): Promise<void> {
  const db = await getDB();
  await db.clear('queue');
}
