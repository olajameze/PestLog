## Offline sync (client IndexedDB + replay)

### Client queue
- Stored in IndexedDB via `lib/offline/db.ts`.
- Used by `hooks/useOfflineQueue.ts` and dashboard logbook form for offline writes.

### Replay
- When back online, `hooks/useOfflineQueue.ts` replays queued operations against `POST /api/offline/sync`.
- The server validates the Supabase JWT via `supabase.auth.getUser(token)`.

### Current behavior
- Logbook entries: supported (`tableName: "logbook_entries"`).
- Chemical logs: stubbed in `pages/api/offline/sync.ts` (requires schema/migration before enabling).

### Limitations
- Offline photo uploads are not supported (requires online storage upload).
- Conflict resolution is last-write-wins at the record level for UPDATE operations.

