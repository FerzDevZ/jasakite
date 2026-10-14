# OWASP Top 10 Mitigation Cheat Sheet

| Risk ID | Vulnerability | Mitigation Strategy |
|---|---|---|
| **A01:2021** | Broken Access Control | Verify user ownership on every record (`WHERE id = :id AND tenant_id = :tenant_id`). Deny by default. |
| **A02:2021** | Cryptographic Failures | Use Argon2id or bcrypt (cost >= 12) for password hashing. Enforce HTTPS via HSTS. |
| **A03:2021** | Injection (SQL, Command, LDAP) | Use parameterized statements / prepared queries. Sanitize and validate with Zod/Pydantic. |
| **A04:2021** | Insecure Design | Threat model workflows. Implement rate limiting and account lockout. |
| **A05:2021** | Security Misconfiguration | Disable debug mode in production. Remove default passwords. Use hardened security headers. |
