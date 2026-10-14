# Temporal.io & Saga Pattern Workflow Architecture

## Workflows vs Activities

- **Workflow Function**: Pure state machine orchestrator. Replayed on restart. **Zero direct I/O**.
- **Activity Function**: Normal idempotent function that interacts with databases, third-party APIs, and external services. Automatically retried with backoff policy.
