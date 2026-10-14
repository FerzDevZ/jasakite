# Automated Anti-Slop Verification Harness

The CIV (Coordinator-Implementor-Verifier) pattern ensures that generated code and text pass deterministic gates before reaching production or user review.

```mermaid
graph LR
    Prompt[User / Agent Task] --> Imp[Implementor Agent / LLM]
    Imp --> Code[Raw Output]
    Code --> Gate[Deterministic Validator Gate]
    Gate -->|Syntax / Type / Slop Fail| Retry[Feedback & Retry]
    Retry --> Imp
    Gate -->|Pass| Out[Clean, Verified Output]
```

## Gate Checklist
1. **Linter / Type-checker pass**: `tsc --noEmit`, `mypy --strict`, `cargo check`, or `go vet`.
2. **Regex Slop Scanner**: Reject outputs containing banned regex tokens.
3. **No Dead Placeholders**: Verify that `TODO: implement`, `FIXME: add rest`, or `// ...` do not exist in committed changes.
