# Kubernetes Production Readiness Checklist

## Security & Reliability Checklist
- [ ] **Read-Only Root Filesystem**: `securityContext.readOnlyRootFilesystem: true`.
- [ ] **Drop All Capabilities**: `securityContext.capabilities.drop: ["ALL"]`.
- [ ] **Run As Non-Root**: `securityContext.runAsNonRoot: true`.
- [ ] **Topology Spread Constraints**: Spread pods across multiple failure zones / nodes.
- [ ] **Graceful Shutdown**: Set `spec.terminationGracePeriodSeconds: 30` or higher to allow in-flight connections to drain.
