# Expand and Contract 4-Step Lifecycle

1. Expand: Add new nullable column/table.
2. Dual-Write: App writes to old and new columns.
3. Backfill: Batch migrate historical records.
4. Contract: Deprecate and drop old column.
