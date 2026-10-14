---
name: sqlite-offline-sync-engine
description: Design and implement bulletproof offline-first SQLite synchronization, queue-based background sync, conflict resolution (LWW / CRDT), and delta sync for mobile and hybrid apps.
---

# 📲 SQLite Offline-First Sync Engine Specification

Master the architecture of local-first mobile and desktop applications capable of operating 100% offline with resilient bidirectional background synchronization.

---

## 🏛️ CORE ARCHITECTURAL INVARIANTS

### 1. The Offline Mutation Outbox Pattern
Never perform network API calls directly from UI state on save. Always write to local SQLite first:
1. **Local Transaction**: Save business record (e.g. `visits`, `invoices`) with `sync_status = 'pending'`.
2. **Outbox Entry**: Insert an atomic action record into `sync_outbox`:
   ```sql
   CREATE TABLE sync_outbox (
     id TEXT PRIMARY KEY,
     table_name TEXT NOT NULL,
     record_id TEXT NOT NULL,
     action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
     payload TEXT NOT NULL, -- JSON snapshot of the record
     idempotency_key TEXT NOT NULL UNIQUE,
     created_at INTEGER NOT NULL,
     attempts INTEGER DEFAULT 0,
     last_error TEXT
   );
   ```

### 2. Conflict Resolution Strategy
- **Client Timestamping**: Every mutation carries a high-resolution UTC timestamp (`client_updated_at`).
- **Last-Write-Wins (LWW) with Version Vectors**: If a record on the server has a newer `server_version`, merge non-conflicting fields or prompt the user for manual reconciliation.
- **Tombstones for Deletion**: Never hard-delete rows in local SQLite before syncing. Mark them as `is_deleted = 1` until the server acknowledges deletion.

### 3. Exponential Backoff & Network Resilience
- Monitor network connectivity changes (`ConnectivityResult.mobile / wifi`).
- When connection returns, process outbox in strict FIFO order with exponential backoff + full jitter:
  `delay = min(max_delay, base_delay * 2^attempts) + random_jitter`.
- Server endpoints MUST enforce the `Idempotency-Key` header to prevent duplicate orders or visits.
