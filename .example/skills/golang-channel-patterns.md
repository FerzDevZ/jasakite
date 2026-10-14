# Go Concurrency Invariants

- Always close channels from sender side
- Use `golang.org/x/sync/errgroup` for parallel fan-out fan-in
