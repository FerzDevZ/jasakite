# CQRS & Event Sourcing Architecture

- Write model writes immutable events to EventStore.
- Projections asynchronously update read databases (Postgres / Elastic).
