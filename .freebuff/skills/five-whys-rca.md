# Root Cause Analysis (RCA) via the 5 Whys

## Example 5 Whys Analysis

- **Problem**: Production database became unresponsive at 14:00 UTC.
- **Why 1**: Active connections reached the maximum pool limit of 500.
- **Why 2**: A batch reporting query held database locks for 45 minutes.
- **Why 3**: The reporting query was run against the primary OLTP database instead of the read replica.
- **Why 4**: The reporting service configuration lacked a replica database connection string.
- **Why 5 (Root Cause)**: The service deployment template did not enforce separate read/write data source variables in CI checks.

**Preventive Fix**: Add automated CI linter ensuring all reporting services bind to read replicas with a strict query timeout of 10 seconds.
