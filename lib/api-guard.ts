import { NextResponse } from "next/server"
import {
  RATE_LIMITS,
  clientKey,
  consume,
  rateLimitHeaders,
  type RateLimitRule,
} from "@/lib/rate-limit"

export { RATE_LIMITS }

/**
 * Terapkan rate limit pada satu route handler.
 * Mengembalikan `null` bila permintaan boleh lanjut, atau NextResponse 429
 * yang sudah lengkap dengan header RateLimit-* dan Retry-After.
 */
export function enforceRateLimit(
  request: Request,
  scope: string,
  rule: RateLimitRule,
  userId?: string | number | null
): NextResponse | null {
  const result = consume(`${scope}:${clientKey(request, userId)}`, rule)

  if (result.ok) return null

  return NextResponse.json(
    {
      error: `Terlalu banyak permintaan. Coba lagi dalam ${result.retryAfterSeconds} detik.`,
    },
    { status: 429, headers: rateLimitHeaders(result) }
  )
}
