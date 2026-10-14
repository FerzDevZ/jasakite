# Caching Strategies & Redis Topologies

## Caching Patterns

| Pattern | Read Behavior | Write Behavior | Best For |
|---|---|---|---|
| **Cache-Aside (Lazy Loading)** | Check Cache $\rightarrow$ On Miss read DB & write to Cache | Write to DB $\rightarrow$ Invalidate / Delete Cache key | General purpose, read-heavy workloads |
| **Write-Through** | Read Cache | Write to Cache $\rightarrow$ Cache synchronously writes to DB | High data consistency requirements |
| **Write-Behind (Write-Back)** | Read Cache | Write to Cache $\rightarrow$ Cache asynchronously queues writes to DB | Extremely high write workloads (e.g. game leaderboards) |

### Preventing Cache Anti-Patterns:
- **Cache Avalanche**: Set jitter on TTLs (`TTL = base_ttl + rand(0, 300)`).
- **Cache Penetration**: Store null values with short TTLs or use Bloom Filters.
- **Cache Stampede (Thundering Herd)**: Use distributed mutex locking (`Redlock`) for rebuilding expired keys.
