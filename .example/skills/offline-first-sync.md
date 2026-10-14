# Offline-First Mobile Data Synchronization Guide

## Conflict Resolution Strategies

1. **Last-Write-Wins (LWW)**: Timestamp-based resolution. Simple, but vulnerable to clock drift.
2. **Deterministic CRDTs (Conflict-Free Replicated Data Types)**: Mathematically guarantees convergence across multiple offline devices editing the same document.
3. **Server-Side Rebase**: The server orders transactions sequentially; clients rebase local uncommitted mutations on top of the latest server version.
