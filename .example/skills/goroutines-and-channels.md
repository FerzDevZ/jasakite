# Go Goroutines, Channels & Context Cancellation

## Production Worker Pool Pattern

```go
package main

import (
	"context"
	"fmt"
	"sync"
)

func worker(ctx context.Context, id int, jobs <-chan int, results chan<- int, wg *sync.WaitGroup) {
	defer wg.Done()
	for {
		select {
		case <-ctx.Done():
			return
		case job, ok := <-jobs:
			if !ok {
				return
			}
			// Process job
			results <- job * 2
		}
	}
}
```
