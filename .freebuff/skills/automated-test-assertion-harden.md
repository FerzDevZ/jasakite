---
name: automated-test-assertion-harden
description: Enforce rigorous behavioral test assertions, eliminating superficial AI dummy tests and trivial mocks.
---

# 🧪 Automated Test Assertion Hardening

## Problem Statement
AI agents often generate trivial "happy-path" unit tests that assert tautologies (e.g. `expect(res).toBeDefined()`, `expect(true).toBe(true)`), giving a false sense of test coverage without testing actual failure states or business logic.

## Dual-Gate Test Invariants
1. **At Least 1 Positive Behavioral Path**: Verify correct state transitions and returned data structure values (exact equality on business properties, not just existence).
2. **At Least 2 Negative / Fault Paths**:
   - Boundary condition (empty string, maximum integer, 0 items, malformed JSON).
   - Network failure or unauthorized access handling.
3. **No Hollow Assertions**:
   - ❌ `expect(result).toBeTruthy();`
   - ✅ `expect(result.status).toBe(HttpStatus.OK);`
   - ✅ `expect(result.payload.balanceCents).toBe(5000);`
4. **Mock Sanity**:
   - Only mock external network calls (Stripe, AWS S3, Sendgrid) and system clock.
   - Never mock internal domain models or database ORM helpers in unit tests if in-memory SQLite/DuckDB can be utilized.
