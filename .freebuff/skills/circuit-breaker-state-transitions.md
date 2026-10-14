# Circuit Breaker States

- CLOSED: Normal operation
- OPEN: Reject immediate calls after error threshold reached
- HALF-OPEN: Probe upstream with test traffic
