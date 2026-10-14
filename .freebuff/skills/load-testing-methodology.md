# Load Testing Methodology & Metric Interpretation

## Critical k6 Metrics

| Metric | Interpretation | Ideal Benchmark |
|---|---|---|
| `http_req_duration (p95)` | 95% of all requests completed faster than this value | `< 250ms` |
| `http_req_duration (p99)` | 99% of all requests completed faster than this value | `< 500ms` |
| `http_req_failed` | Percentage of failed HTTP requests (status != 2xx/3xx) | `< 0.1%` (99.9% success) |
| `iterations` | Total completed test user iteration loops | High throughput |
| `vus` | Active virtual user concurrency | Matches load profile |
