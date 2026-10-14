# Code Smells & Refactoring Recipes

| Code Smell | Symptom | Refactoring Technique |
|---|---|---|
| **God Class / Blob** | Single class with thousands of lines and dozens of responsibilities | Extract Class / Extract Use Cases |
| **Feature Envy** | Method in class A spends more time accessing data from class B | Move Method to class B |
| **Primitive Obsession** | Using raw strings for emails, phone numbers, money | Introduce Value Objects (e.g. `EmailAddress`, `Money`) |
| **Long Parameter List** | Functions taking > 4 positional arguments | Introduce Parameter Object / Command Object |
| **Shotgun Surgery** | A single business change requires modifying 10 different files | Move related logic into a unified Aggregate Root |
