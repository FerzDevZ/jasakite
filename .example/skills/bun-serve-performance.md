# Bun.serve High-Throughput HTTP Server

```ts
Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello from Bun Server!");
  },
});
```
