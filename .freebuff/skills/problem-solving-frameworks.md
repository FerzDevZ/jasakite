# Problem Solving Frameworks for Engineers

## 1. The Invariant Preservation Pattern
When designing functions or classes, define preconditions, invariants, and postconditions:
- **Precondition**: What must be true before execution? (e.g. `balance >= amount`, `amount > 0`)
- **Invariant**: What must remain true throughout? (e.g. `total_assets == sum(account_balances)`)
- **Postcondition**: What is guaranteed upon exit? (e.g. `source_balance == old_balance - amount`)

## 2. The Idempotency & Replayability Model
In distributed or async systems, operations WILL be retried.
- Every mutating request should include an `Idempotency-Key`.
- Database operations should use `ON CONFLICT (id) DO UPDATE` or conditional writes (`WHERE version = 1`).

## 3. Backpressure & Rate Limiting Model
- Never allow an unbounded queue in memory.
- If consumers are slower than producers: drop, reject with `429 Too Many Requests`, or block upstream.

## 4. Failure Mode and Effects Analysis (FMEA)
Ask: "If this line fails, what happens?"
- Database is down $\rightarrow$ Circuit breaker trips, cached fallback returned.
- Third-party API times out $\rightarrow$ Non-blocking retry with exponential backoff & jitter.
