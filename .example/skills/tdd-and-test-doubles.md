# TDD Principles & Test Double Taxonomy

| Test Double | Definition | Usage Example |
|---|---|---|
| **Dummy** | Passed around but never actually used | Empty string or dummy logger parameter |
| **Stub** | Provides pre-canned answers to calls made during test | `mockRepo.findById.mockResolvedValue(fixedUser)` |
| **Spy** | Records information about how it was called | `expect(emailSenderSpy).toHaveBeenCalledWith('a@b.com')` |
| **Mock** | Pre-programmed with expectations of calls it should receive | Strict mock with call count and exact arguments |
| **Fake** | Working implementation with shortcuts | In-memory SQLite or In-Memory Hash Map Repository |
