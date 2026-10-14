# Chaos Engineering Steady-State Hypothesis Guide

## Anatomy of a Chaos Experiment

```json
{
  "title": "Payment Gateway Timeout Resilience",
  "steady_state": {
    "metrics": [
      { "name": "order_creation_success_rate", "target": ">= 99.5%" },
      { "name": "checkout_p95_latency", "target": "<= 800ms" }
    ]
  },
  "hypothesis": "Injecting 3000ms latency into Payment Gateway will trigger circuit breaker within 5s, returning queued order status without failing HTTP requests.",
  "fault": {
    "action": "inject_network_latency",
    "target_service": "payment-gateway",
    "latency_ms": 3000,
    "duration_seconds": 60
  },
  "abort_conditions": [
    { "metric": "http_5xx_rate", "operator": ">", "threshold": 0.05 }
  ]
}
```
