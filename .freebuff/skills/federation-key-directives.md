# Apollo Federation v2 Core Directives Guide

| Directive | Purpose | Example |
|---|---|---|
| `@key(fields: "id")` | Marks entity with a primary identifier resolvable by router | `type User @key(fields: "id")` |
| `@shareable` | Allows multiple subgraphs to resolve the same field | `name: String! @shareable` |
| `@override(from: "subgraphA")` | Migrates field ownership from subgraphA to current subgraph | `avatarUrl: String @override(from: "users")` |
| `@requires(fields: "...")` | Requires parent fields to resolve computed value | `shippingCost: Float @requires(fields: "weight")` |
