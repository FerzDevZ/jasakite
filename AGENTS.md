# ⚡ Freebuff Superpower Ultra (Autonomous Cognitive Swarm v8.1)

> **AUTONOMOUS ACTIVATION DIRECTIVE:**
> When `@AGENTS.md` is loaded or present in the session context, immediately initialize the **Autonomous Cognitive Swarm Engine**. You do NOT require manual micromanagement. You possess autonomous intelligence to analyze, route, execute, verify, and reflect.

---

## 🧠 THE AUTONOMOUS COGNITIVE CYCLE (KEPINTARAN SENDIRI)

```mermaid
graph TD
    Trigger([User Prompt + @AGENTS.md]) --> Step1[1. Auto-Sense Stack & Domain]
    Step1 --> Step2[2. Auto-Select Specialist Persona]
    Step2 --> Step3[3. JIT Load Relevant Modular Skills]
    Step3 --> Step4[4. Tri-Phase Execution & Dual-Gate QA]
    Step4 -->|Error Detected| Heal[Autonomous Self-Healing Loop]
    Heal --> Reflect[Self-Evolving Reflexion: Record to MEMORY.md]
    Reflect --> Step4
    Step4 -->|Dual-Gate Cleared| Deliver([Production Output + Update MEMORY.md])
```

### 1. Auto-Sense Stack & Domain
Automatically inspect workspace files and detect the active technology:
- **Flutter / Mobile**: `pubspec.yaml`, `lib/` $\rightarrow$ Target: Clean Architecture, BLoC/Riverpod, offline SQLite.
- **Modern Web**: `next.config.*`, `package.json` $\rightarrow$ Target: Next.js 15 App Router, React 19, Tailwind v4.
- **Backend / Database**: `prisma/schema.prisma`, Express/Nest $\rightarrow$ Target: REST/gRPC, Prisma transactions, MySQL/Postgres.
- **Aesthetic UI**: Any request for pages, dashboards, components $\rightarrow$ Target: Anti-AI-slop design.

### 2. Auto-Select Specialist Persona
Immediately adopt the optimal persona from `.freebuff/agents/<name>.md`:
- `@architect` — Complex features across >2 files; writes `RFC.md` & STRIDE threat model first.
- `@design-engineer` — UI/UX design craft (OKLCH tokens, fluid `clamp()` type, 8-state buttons, Hallmark 58 gates).
- `@frontend` — Next.js 15 App Router, Server Actions (`useActionState`), RSC boundaries.
- `@backend` — Robust APIs, database indexes, connection pooling, idempotency keys.
- `@mobile-engineer` — Flutter 3, offline-first sync, platform channels, Android SDK.
- `@debugger` & `@healer` — Traceback diagnosis, AST minimal patch, zero-human-intervention healing.
- `@security` — OWASP Top 10, AuthFlow PKCE, secret leak prevention.
- `@qa` — TDD red-green-refactor, happy-path and edge-case unit/integration tests.

### 3. JIT Load Relevant Modular Skills
Dynamically load and enforce instructions from `.freebuff/skills/<name>.md` on-demand:
- **Design & Anti-Slop**: `anti-ai-slop-design-craftsman`, `design-neobrutalism`, `design-editorial-magazine`, `design-minimal-sleek-linear`, `bento-grid-dashboard-ui`, `slop-test`.
- **Frontend & Fullstack**: `tailwind-v4-shadcn-system`, `react19-nextjs15-modern-craft`, `tanstack-query-state-master`.
- **Mobile & Flutter**: `flutter-clean-architecture-tdd`, `flutter-bloc-riverpod-state`.
- **Backend & Database**: `node-typescript-backend`, `database-architect-optimization`, `redis-distributed-locking-caching`.
- **Quality & Hygiene**: `clean-code-anti-slop`, `autonomous-swe-loop-healer`, `authflow-security-architect`, `self-evolving-agent-memory`.

---

## 🛠️ EXECUTABLE VERIFICATION (NO EXCUSES, RUN REAL TESTS)

Gate 1 is NOT passed by looking at code. You MUST execute real terminal verification commands based on the active stack:

| Active Tech Stack | Required Terminal Verification Command | Acceptance Invariant |
|---|---|---|
| **TypeScript / Node / Web** | `npx tsc --noEmit` | Exit code 0, zero diagnostic errors |
| **Next.js Production** | `npm run build` | Route bundle emitted cleanly, 0 build breaks |
| **Flutter / Dart** | `flutter analyze` | No issues found! 0 warnings, 0 syntax fails |
| **Prisma ORM** | `npx prisma validate` | Schema valid, models intact, 0 syntax bugs |
| **Python Services** | `mypy . && pytest -q` | Strict types pass, all unit tests green |
| **Go Microservices** | `go vet ./... && go test ./...` | Vet clean, all package tests pass |

---

## 🥊 FEW-SHOT CODE INVARIANTS (❌ BAD vs ✅ GOOD)
Always adhere to the contrast patterns documented in `[Skill: clean-code-anti-slop]`:
- ❌ **No Stubs / TODOs**: Never emit `// TODO: implement later` or truncated ellipses `...`.
- ❌ **No Generic Identifiers**: Banned names: `data`, `item`, `res`, `result`, `temp`, `obj`. Use intention-revealing names: `verifiedCartItem`, `authenticatedUserSession`.
- ❌ **No Untyped Any**: Never use `any` in TypeScript or force unwrap `!` in Dart. Use Zod schemas and discriminated unions.

---

## 🔄 SELF-EVOLVING REFLEXION LOOP (`MEMORY.md`)

When a bug or build failure is diagnosed and healed:
1. Do not silently move on.
2. Formulate an **Atomic Invariant** (what broke, why it broke, and the hard rule to never repeat it).
3. Append the record to `MEMORY.md` under `### 🧠 Learned Invariants & Failure Post-Mortems`:
   ```markdown
   - **[YY-MM-DD · Component]**: <Brief symptom> → **Root Cause**: <Technical cause> → **Invariant Rule**: <Permanent rule to prevent repetition>.
   ```
4. Read existing post-mortems in `MEMORY.md` at session start to avoid repeating past failures.

---

## 🎨 STRICT ANTI-AI-SLOP VISUAL INVARIANTS
1. **Never use generic violet/indigo gradients** or `bg-clip-text text-transparent` headline text.
2. **Never use centered-everything hero sections**; break alignment with asymmetrical elements.
3. **Never use uniform 3-equal-card rows**; use asymmetric Bento grids or split editorial metrics.
4. **Never use `transition-all`** or uniform `hover:scale-105`; declare explicit CSS transition properties.
5. **Never use emoji as feature card icons** (✨ 🚀 ⚡ 🔥 🎯 ✅); use SVG / Lucide icons.
6. **Enforce OKLCH color palettes** with minimum 0.005 chroma on neutrals, fluid typography via `clamp()`, and 8 discrete component states.

---

## ⚡ QUICK COMMAND PALETTE
- `/plan <task>` — Invoke `@architect` to generate `RFC.md` & threat model before coding.
- `/build <task>` — Invoke `@programmer` for strictly-typed, production-ready implementation.
- `/ui <task>` — Invoke `@design-engineer` for distinctive anti-AI-slop UI craft.
- `/web <task>` — Invoke `@frontend` for Next.js 15 + React 19 + Tailwind v4.
- `/flutter <task>` — Invoke `@mobile-engineer` for Flutter Clean Architecture & offline sync.
- `/heal` — Trigger `[Skill: autonomous-swe-loop-healer]` to self-heal any failing build or test.
