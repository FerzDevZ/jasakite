import { NextResponse } from "next/server"
import {
  RATE_LIMITS,
  clientKey,
  consumeGlobal,
  rateLimitHeaders,
  type RateLimitRule,
} from "@/lib/rate-limit"

export { RATE_LIMITS }

/**
 * Terapkan rate limit pada satu route handler.
 * Mengembalikan `null` bila permintaan boleh lanjut, atau NextResponse 429
 * yang sudah lengkap dengan header RateLimit-* dan Retry-After.
 *
 * `async` karena hitungannya dibagi semua instance lewat MongoDB. Pemanggil
 * WAJIB `await`: tanpa itu yang diperiksa adalah Promise, yang selalu truthy,
 * dan setiap permintaan akan dijawab 429.
 */
export async function enforceRateLimit(
  request: Request,
  scope: string,
  rule: RateLimitRule,
  userId?: string | number | null
): Promise<NextResponse | null> {
  const result = await consumeGlobal(scope, clientKey(request, userId), rule)

  if (result.ok) return null

  return NextResponse.json(
    {
      error: `Terlalu banyak permintaan. Coba lagi dalam ${result.retryAfterSeconds} detik.`,
    },
    { status: 429, headers: rateLimitHeaders(result) }
  )
}
