---
name: ferz-22-tdd-autonomous-bug-hunter
description: "Test-Driven Development (TDD) engine for autonomous bug reproduction, test harness generation, and regression prevention with Vitest/Jest/Pytest."
version: 1.0.0
author: "FerzDevZ Enterprise"
---

# 🎯 Ferz 22: TDD Autonomous Bug Hunter

## Autonomous TDD Execution Cycle
1. **Red Phase (Reproduce First)**:
   - Before modifying any production code, write a minimal failing test case (`*.test.ts`, `*.test.js`, or `test_*.py`) that precisely reproduces the bug reported by the user.
   - Run the test suite via the terminal tool and verify that it fails with the expected error.
2. **Green Phase (Minimal Fix)**:
   - Apply the cleanest, minimal code fix via `write_file` or `patch`.
   - Re-run the test suite and verify that the test turns green (passes with 0 errors).
3. **Refactor Phase (Clean Architecture)**:
   - Clean up any code smells while keeping all tests passing.
   - Ensure zero regression across the entire test suite.
