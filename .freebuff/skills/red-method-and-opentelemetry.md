# The RED Method & OpenTelemetry Trace Correlation

## Essential PromQL Queries

### 1. Request Rate (RPS)
```promql
sum(rate(http_requests_total[5m])) by (service, handler)
```

### 2. Error Percentage Rate
```promql
sum(rate(http_requests_total{status=~"5.."}[5m])) 
/ 
sum(rate(http_requests_total[5m])) * 100
```

### 3. P99 Latency (Duration)
```promql
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```
