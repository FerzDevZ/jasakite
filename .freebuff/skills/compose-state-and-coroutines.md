# Android Jetpack Compose & StateFlow Guide

## State Pattern with StateFlow

```kotlin
class FeedViewModel(private val repository: FeedRepository) : ViewModel() {
    val uiState: StateFlow<FeedUiState> = repository.getFeedStream()
        .map { FeedUiState.Success(it) }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = FeedUiState.Loading
        )
}
```
