# GitHub Actions Optimization & Security Hardening

## GitHub OIDC for Cloud Authentication (AWS Example)

```yaml
permissions:
  id-token: write # Required for requesting OIDC JWT
  contents: read

steps:
  - name: Configure AWS Credentials via OIDC
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsDeploymentRole
      aws-region: us-east-1
```

- Completely removes the need for static `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` secrets.
- Short-lived temporary session tokens are issued automatically per job.
