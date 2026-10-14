# Rust Ownership, Concurrency & Tokio Guide

## Shared State Across Async Tasks

```rust
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct AppState {
    pub counter: Arc<RwLock<u64>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            counter: Arc::new(RwLock::new(0)),
        }
    }

    pub async fn increment(&self) -> u64 {
        let mut lock = self.counter.write().await;
        *lock += 1;
        *lock
    }
}
```
