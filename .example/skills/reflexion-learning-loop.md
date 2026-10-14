# Agent Reflexion & Memory Architecture Guide

## Memory Storage Structure

```json
{
  "timestamp": "2026-08-20T13:45:00Z",
  "category": "BUILD_TOOLING",
  "task": "FastAPI async SQLAlchemy setup",
  "mistake": "Used synchronous Session() inside async def route handler",
  "lesson": "Always inject AsyncSession via async_sessionmaker and yield in async generator."
}
```
