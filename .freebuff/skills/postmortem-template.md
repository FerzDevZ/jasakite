# Incident Postmortem: [Incident Name]

- **Date**: YYYY-MM-DD
- **Severity**: [P1 / P2 / P3]
- **Incident Commander**: [Name]
- **Impact**: [e.g. 15,000 users experienced 504 Gateway Timeouts for 24 minutes]

## Summary
Brief narrative of what happened, customer impact, and how it was mitigated.

## Timeline (UTC)
- **14:00** - First alert triggered on Grafana P99 latency.
- **14:05** - Incident commander declared P1 and opened war room.
- **14:12** - Traffic identified as abusive bot crawl; Cloudflare WAF rule deployed.
- **14:24** - Latency returned to normal baseline; incident resolved.

## Root Cause (5 Whys)
1. ...
2. ...

## Preventative Action Items
| Action Item | Type | Owner | Due Date | Status |
|---|---|---|---|---|
| Configure rate limiting on /api/v1/search | Prevent | @engineer | YYYY-MM-DD | Open |
| Add alert for sudden surge in 429/504 responses | Detect | @sre | YYYY-MM-DD | Open |
