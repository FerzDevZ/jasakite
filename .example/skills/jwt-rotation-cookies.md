# JWT Rotation & Secure Cookie Architecture

## Cookie Configuration Specification

```http
Set-Cookie: __Host-refresh_token=v_1_abc123...; 
            Path=/; 
            Secure; 
            HttpOnly; 
            SameSite=Strict; 
            Max-Age=604800
```

- **`__Host-` Prefix**: Enforces that cookie must come from HTTPS, cannot have a domain attribute set, and path must be `/`.
- **`HttpOnly`**: JavaScript document.cookie cannot read or leak the token.
- **`SameSite=Strict`**: Cookie is never sent on cross-site requests, mitigating CSRF.

## Token Family Revocation in Redis

```json
{
  "family_id": "fam_987123",
  "current_token_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "user_id": "usr_456",
  "is_revoked": false,
  "expires_at": 1740000000
}
```
If a request arrives with an old token hash belonging to `family_id`, immediately set `is_revoked: true` and purge all active sessions for `user_id`.
