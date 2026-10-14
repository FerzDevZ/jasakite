/**
 * Minimal CSRF double-submit helper.
 * - Cookie: `csrf-token` (HttpOnly false, SameSite Strict)
 * - Header: `x-csrf-token` must match cookie value for state-changing methods.
 * - Safe methods GET/HEAD/OPTIONS are bypassed.
 */

export function generateCsrfToken(): string {
  // Prefer Web Crypto
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID()
  }
  // Fallback Math.random (dev only) — cukup untuk minimal implementation
  return (
    Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Date.now().toString(36)
  )
}

function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function isCsrfValid(req: Request): boolean {
  const method = (req.method ?? "GET").toUpperCase()
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true
  const headerToken = req.headers.get("x-csrf-token")
  const cookieHeader = req.headers.get("cookie")
  const cookieToken = getCookieValue(cookieHeader, "csrf-token")
  if (!headerToken || !cookieToken) return false
  return headerToken === cookieToken
}
