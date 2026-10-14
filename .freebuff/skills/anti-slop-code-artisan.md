---
name: anti-slop-code-artisan
description: Write clean, idiomatic code with zero AI slop, no speculative abstractions, and no placeholder stubs.
---

# 🛡️ Anti-Slop Code Artisan Standard

## Core Invariants
1. **Zero Placeholder Stubs**: Never write `// TODO: implement later`, `pass`, or `throw new Error("Not implemented")`. Provide complete, functioning logic or fail loudly at compilation/typecheck time.
2. **Zero Redundant Comments**: Eliminate comments that merely rephrase the syntax (e.g. `// calculate total` above `const total = calculateTotal();`). Comments should only capture non-obvious business domain context or trade-offs.
3. **Domain-Driven Naming**: Use domain nouns and intention-revealing verbs instead of generic AI variables (`data`, `res`, `temp`, `info`, `item`).
4. **Flat Control Flow**: Guard clauses first. Return early. Avoid deeply nested `if/else` ladders (cyclomatic complexity < 5 per routine).
5. **No Speculative Generics**: Do not create interfaces or abstraction layers for things used only once. Follow YAGNI (You Aren't Gonna Need It).

## Anti-Pattern vs Artisan Pattern

### ❌ AI-Slop Example
```typescript
// Define user interface
interface User {
  id: string;
  name: string;
  // TODO: add other fields
}

// Function to get user
function getUser(id: string) {
  // return user result
  return fetchUser(id);
}
```

### ✅ Clean Artisan Pattern
```typescript
interface UserAccount {
  readonly id: UserId;
  readonly displayName: string;
  readonly emailAddress: EmailAddress;
}

export async function fetchActiveAccount(id: UserId): Promise<UserAccount> {
  const account = await accountRepository.findById(id);
  if (!account) {
    throw new AccountNotFoundError(id);
  }
  return account;
}
```
