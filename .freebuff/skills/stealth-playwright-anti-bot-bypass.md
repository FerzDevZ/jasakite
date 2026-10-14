---
name: stealth-playwright-anti-bot-bypass
description: Build undetectable web scrapers and browser automations with Playwright. Bypass Cloudflare Turnstile, DataDome, Akamai, canvas fingerprinting, WebGL leaks, and automate residential proxy rotation.
---

# 🕵️ Stealth Playwright & Anti-Bot Defense Bypass

Master industrial-grade web automation that remains 100% invisible to modern anti-bot systems (Cloudflare 5s challenge, DataDome, PerimeterX).

---

## 🛡️ CORE STEALTH TECHNIQUES

### 1. Zero-Detection Browser Launch Arguments
Mask Chromium automation flags and hardware spoofing:
```typescript
import { chromium } from 'playwright-extra'
import stealthPlugin from 'puppeteer-extra-plugin-stealth'

chromium.use(stealthPlugin())

export async function createStealthBrowserSession(proxyUrl?: string) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-size=1920,1080',
    ],
    proxy: proxyUrl ? { server: proxyUrl } : undefined,
  })

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'Asia/Jakarta',
  })

  // Prevent webdriver detection in navigator
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    // Spoof realistic hardware concurrency and memory
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 })
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 })
  })

  return { browser, context }
}
```

### 2. Human-Like Behavior Simulation
- **Gaussian Mouse Movement**: Avoid instant teleport clicks (`click()`). Use spline curve interpolation with randomized jitter.
- **Natural Keystroke Jitter**: Delay between keypresses: `50ms + random(10ms, 80ms)`.
- **Dynamic Scroll Pacing**: Smooth scrolling with intermittent reading pauses.
