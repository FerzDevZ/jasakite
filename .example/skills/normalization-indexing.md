# Normalization, Constraints & Indexing Guide

## Indexing Strategy (PostgreSQL / Relational DB)

| Query Pattern | Index Type | Example SQL |
|---|---|---|
| Exact match / Range query on single column | **B-Tree** (Default) | `CREATE INDEX idx_orders_user_id ON orders (user_id);` |
| Multi-column query (`WHERE a = ? AND b = ?`) | **Composite B-Tree** | `CREATE INDEX idx_orders_user_state ON orders (user_id, state);` |
| Filtered active rows only | **Partial Index** | `CREATE UNIQUE INDEX uq_active_user_email ON users (email) WHERE deleted_at IS NULL;` |
| Full-text search / JSONB keys | **GIN** | `CREATE INDEX idx_products_tags ON products USING gin (tags);` |
| Geometric / Range datatypes | **GiST** / **BRIN** | `CREATE INDEX idx_events_timerange ON events USING gist (during);` |

### The Leftmost Prefix Rule
A composite index on `(tenant_id, status, created_at)` accelerates:
- `WHERE tenant_id = ?`
- `WHERE tenant_id = ? AND status = ?`
- `WHERE tenant_id = ? AND status = ? AND created_at > ?`

It does **NOT** accelerate `WHERE status = ?` on its own.
