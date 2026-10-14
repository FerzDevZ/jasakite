---
name: bun-elysia-hyper-speed
description: Build ultra-fast TypeScript backend microservices with Bun runtime and Elysia.js. 30x faster startup than Node, end-to-end type safety, native WebSockets, and zero-overhead validation with TypeBox.
---

# ⚡ Bun & Elysia.js Hyper-Speed Backend Standard

Build blisteringly fast TypeScript APIs handling 100k+ requests per second with native Bun runtime and Elysia.js.

---

## 🏛️ ARCHITECTURAL INVARIANTS

### 1. Zero-Overhead End-to-End Type Safety
Use Elysia's native `t` schema (powered by TypeBox) for compile-time and runtime validation:

```typescript
import { Elysia, t } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { cors } from '@elysiajs/cors'

export const app = new Elysia()
  .use(cors())
  .use(swagger())
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400
      return { success: false, error: error.validator.Errors(error.value).First()?.message }
    }
    set.status = 500
    return { success: false, error: 'Internal Server Error' }
  })
  .group('/api/v1', (app) =>
    app
      .post(
        '/users',
        async ({ body, set }) => {
          // Native Bun SQLite / PostgreSQL query
          set.status = 201
          return { success: true, data: { id: crypto.randomUUID(), ...body } }
        },
        {
          body: t.Object({
            email: t.String({ format: 'email' }),
            name: t.String({ minLength: 2, maxLength: 50 }),
            role: t.Union([t.Literal('ADMIN'), t.Literal('MEMBER')]),
          }),
          response: {
            201: t.Object({
              success: t.Boolean(),
              data: t.Object({
                id: t.String(),
                email: t.String(),
                name: t.String(),
                role: t.String(),
              }),
            }),
          },
        }
      )
  )
  .listen(3000)

console.log(`🚀 Hyper-speed server running at ${app.server?.hostname}:${app.server?.port}`)
```

### 2. High-Throughput WebSockets
Leverage Bun's native C++ WebSocket engine for sub-millisecond real-time event streaming:
```typescript
app.ws('/ws/stream', {
  open(ws) {
    ws.subscribe('market-telemetry')
  },
  message(ws, message) {
    ws.publish('market-telemetry', message)
  },
  close(ws) {
    ws.unsubscribe('market-telemetry')
  }
})
```
