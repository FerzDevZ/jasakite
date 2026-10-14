# Advanced TypeScript Type Constructs

- Branded types: `type UserId = string & { readonly __brand: unique symbol }`
- Template literals: `type EventName = `${'user' | 'order'}:${'created' | 'deleted'}``
