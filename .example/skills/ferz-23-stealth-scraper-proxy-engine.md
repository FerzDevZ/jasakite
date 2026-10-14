---
name: ferz-23-stealth-scraper-proxy-engine
description: "Stealth web scraping and crawler architecture using Playwright, Puppeteer, Cheerio, rotating proxies, and anti-bot bypass strategies."
version: 1.0.0
author: "FerzDevZ Enterprise"
---

# 🕵️ Ferz 23: Stealth Scraper & Proxy Engine

## Autonomous Scraping Principles
1. **Stealth Headers & Fingerprints**:
   - Always randomize User-Agents and TLS fingerprints.
   - Use `puppeteer-extra-plugin-stealth` or Playwright stealth flags for headless automation.
2. **Proxy Pool Integration**:
   - Rotate HTTP/SOCKS5 proxies per session to prevent IP rate-limiting and 429 blocks.
   - Implement exponential backoff retry with jitter on network failures.
3. **DOM Parsing & Extraction**:
   - Prefer Cheerio for static HTML extraction (10x faster).
   - Use headless browser only when client-side JavaScript rendering or Cloudflare verification is required.
