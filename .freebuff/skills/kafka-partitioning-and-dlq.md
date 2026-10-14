# Apache Kafka Partitioning Strategy & Error Handling

## Key Producer Invariants

- `acks=all` (Wait for all in-sync replicas before acknowledging)
- `enable.idempotence=true` (Prevents duplicate messages)
- `max.in.flight.requests.per.connection=5` (Guarantees ordering while maximizing batching)
- `compression.type=snappy` / `zstd` (Minimizes network bandwidth consumption)
