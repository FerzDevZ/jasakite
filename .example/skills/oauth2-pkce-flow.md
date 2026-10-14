# OAuth 2.0 PKCE & OIDC Implementation Guide

## PKCE (Proof Key for Code Exchange) Mechanics

1. **Code Verifier**: High-entropy cryptographic random string (43–128 characters, `[A-Z, a-z, 0-9, -, ., _, ~]`).
2. **Code Challenge**: `BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))`.
3. **Challenge Method**: Always `S256` (Never use `plain`).

### Security Defenses:
- **State Parameter**: Cryptographic nonce generated on client to prevent Cross-Site Request Forgery (CSRF).
- **Nonce Parameter**: Embedded inside ID token to prevent replay attacks.
- **Exact Redirect URI Matching**: Server must reject any wildcards in callback URIs.
