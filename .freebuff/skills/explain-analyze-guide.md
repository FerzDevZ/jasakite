# PostgreSQL EXPLAIN (ANALYZE, BUFFERS) Guide

## Key Execution Plan Nodes

| Node Type | Meaning | Verdict |
|---|---|---|
| **Seq Scan** | Reads entire table sequentially | ❌ Bad for large tables; needs index |
| **Index Scan** | Reads index, then fetches row from table heap | ⚠️ Good, but accesses table heap |
| **Index Only Scan** | Fetches all requested columns directly from index | ✅ Optimal; zero heap access |
| **Bitmap Index Scan** | Builds bitmap of pages from index, then reads table | ✅ Good for multiple OR conditions |

### Critical Flags:
- `Buffers: shared hit=... read=...`: `hit` means read from RAM cache, `read` means read from disk.
- `Rows Removed by Filter`: High number indicates index is not filtering early enough.
