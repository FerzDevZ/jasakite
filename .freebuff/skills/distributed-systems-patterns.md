# Distributed Systems Architectural Patterns

## 1. Saga Pattern (Distributed Transactions)
- **Choreography**: Services publish domain events; downstream services react and emit next events. Best for simple workflows (2-4 steps).
- **Orchestration**: A central orchestrator service coordinates every step and triggers explicit compensating transactions if a step fails. Best for complex multi-step workflows.

## 2. CQRS (Command Query Responsibility Segregation)
- Separate the **Write Model** (optimized for business invariants, normalized RDBMS) from the **Read Model** (optimized for high-speed queries, denormalized Elasticsearch/Redis).

## 3. Circuit Breaker States
- **Closed**: Requests flow normally.
- **Open**: Consecutive errors exceed threshold; requests fail immediately without calling failing downstream service.
- **Half-Open**: Periodic canary requests sent to test if downstream service has recovered.
