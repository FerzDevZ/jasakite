# Modern SwiftUI Observation & Concurrency Guide

## Observation Pattern (iOS 17+)

```swift
import SwiftUI
import Observation

@Observable
@MainActor
final class FeedViewModel {
    var items: [String] = []
    var isLoading = false
    
    func loadFeed() async {
        isLoading = true
        defer { isLoading = false }
        // Async network fetch
    }
}
```
