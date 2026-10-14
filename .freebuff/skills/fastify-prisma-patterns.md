# Fastify & Modern TypeScript Backend Patterns

## Graceful Shutdown Invariant

Always handle `SIGTERM` and `SIGINT` cleanly to drain in-flight HTTP requests and close database connection pools:

```typescript
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

for (const signal of signals) {
  process.on(signal, async () => {
    logger.info(`Received ${signal}, closing server gracefully...`);
    await app.close();
    await db.$disconnect();
    process.exit(0);
  });
}
```
