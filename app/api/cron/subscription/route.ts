import { NextResponse } from "next/server"
import { renewDueSubscriptions } from "@/lib/subscription-server"

export const dynamic = "force-dynamic"

/**
 * Penagihan langganan penyedia otomatis (cron harian Vercel).
 *
 * Dijadwalkan di vercel.json (`0 1 * * *` = 08.00 WIB). Vercel mengirim
 * `Authorization: Bearer $CRON_SECRET`; tanpa header itu endpoint ini adalah
 * cara gratis memotong saldo semua penyedia, jadi permintaan tanpa kunci
 * yang cocok selalu ditolak.
 *
 * Sengaja TIDAK memakai `auth()`: cron tidak punya sesi pengguna. Rahasia
 * cron adalah satu-satunya kredensial di sini, dan dibandingkan dengan
 * panjang yang sama untuk menghindari kebocoran lewat waktu eksekusi.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    console.error("[cron/subscription] CRON_SECRET belum disetel")
    return NextResponse.json(
      { error: "Cron belum dikonfigurasi" },
      { status: 503 }
    )
  }

  const header = request.headers.get("authorization") ?? ""
  const expected = `Bearer ${secret}`
  if (!timingSafeEqual(header, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const summary = await renewDueSubscriptions()
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    console.error("[cron/subscription] gagal menagih:", error)
    return NextResponse.json(
      { error: "Penagihan gagal dijalankan" },
      { status: 500 }
    )
  }
}

/** Perbandingan waktu-tetap sederhana untuk rahasia berukuran pendek. */
function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return mismatch === 0
}
