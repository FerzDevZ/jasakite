# Stealth Web Scraping & Fingerprint Evasion Guide

## Key Fingerprint Attributes to Mask

1. **`navigator.webdriver`**: Must be `undefined` or `false`.
2. **`navigator.plugins`**: Must return a realistic array of browser plugins (PDF Viewer, etc.).
3. **Canvas & WebGL Noise**: Introduce subtle sub-pixel noise to prevent deterministic hardware hash tracking.
4. **TLS Client Hello (JA3/JA4)**: Use Python `curl_cffi` or Go `tls-client` to mimic real Chrome/Safari TLS fingerprints.
