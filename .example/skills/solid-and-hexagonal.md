# SOLID Principles & Hexagonal Architecture (Ports and Adapters)

## Ports and Adapters Pattern

- **Primary Port (Driving)**: Interface exposed by the use case (e.g. `RegisterUserUseCase`). Invoked by driving adapters (REST controllers, CLI).
- **Secondary Port (Driven)**: Interface required by the use case (e.g. `UserRepositoryPort`, `NotificationSenderPort`). Implemented by driven adapters (PostgresUserRepository, SendGridNotificationSender).

## SOLID Rules
1. **Single Responsibility (SRP)**: A class/module should have only one reason to change.
2. **Open/Closed (OCP)**: Open for extension (via interfaces/plugins), closed for modification.
3. **Liskov Substitution (LSP)**: Subtypes must be substitutable for their base types without breaking behavior.
4. **Interface Segregation (ISP)**: Clients should not be forced to depend on methods they do not use.
5. **Dependency Inversion (DIP)**: High-level modules must not depend on low-level modules; both depend on abstractions.
