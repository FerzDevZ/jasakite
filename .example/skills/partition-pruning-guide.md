# Declarative PostgreSQL Partitioning

`CREATE TABLE metrics (...) PARTITION BY RANGE (created_at);`
Query planner eliminates unneeded partitions via Partition Pruning.
