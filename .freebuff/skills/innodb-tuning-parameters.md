# MySQL InnoDB Critical Configuration

- `innodb_buffer_pool_size = 70% RAM`
- `innodb_flush_log_at_trx_commit = 2` (High throughput with 1s crash durability)
