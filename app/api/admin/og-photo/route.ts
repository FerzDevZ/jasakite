import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { prismaId } from "@/lib/ids"
import { RATE_LIMITS, enforceRateLimit } from "@/lib/api-guard"
import { isAdminRole } from "@/lib/roles"
import {
  formatOgPhotoPreflightReportText,
  ogPhotoPreflightReport,
} from "@/lib/og-photo-preflight"
import {
  flushOgPhotoPreflightSnapshot,
  formatOgPhotoPreflightWindowText,
  readOgPhotoPreflightWindow,
  resolveOgPhotoPreflightWindow,
  type OgPhotoPreflightWindow,
} from "@/lib/og-photo-preflight-snapshot"

export const dynamic = "force-dynamic"

/**
 * Kesehatan preflight foto kartu OG.
 *
 * Kartu dengan foto yang gagal diambil tetap membalas HTTP 200 berisi PNG sah
 * (panel monogram), jadi tidak ada status respons, tidak ada error rate, dan
 * tidak ada halaman yang rusak — kehilangan foto hanya terlihat di log. Endpoint
 * ini menutup celah itu: hitungan per alasan kegagalan, per status HTTP, per
 * host, plus kegagalan terakhir, dan episode alert yang sedang berjalan.
 *
 * Dua cakupan disajikan berdampingan dan sengaja tidak digabung:
 * - `process`: keadaan proses yang menjawab permintaan ini (dulu satu-satunya
 *   yang ada). Reset saat redeploy, dan di multi-instance hanya bagiannya.
 * - `aggregate`: jendela waktu yang dijumlahkan dari snapshot Mongo semua
 *   instance — inilah angka yang selamat dari restart dan bisa dipakai
 *   memutuskan "ini masalah platform atau satu instance".
 *
 * `?format=text` mengembalikan ringkasan siap baca untuk dibuka langsung dari
 * browser/terminal admin; bentuk JSON jadi default-nya untuk dibaca monitoring.
 *
 * Hanya admin: URL foto penyedia bukan data publik, dan hitungannya bisa
 * dipakai memetakan trafik crawler.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = await prisma.user.findUnique({
    where: { id: prismaId(session.user.id) },
    select: { role: true },
  })
  if (!isAdminRole(admin?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const limited = await enforceRateLimit(
    request,
    "admin-og-photo",
    RATE_LIMITS.adminRead,
    session.user.id
  )
  if (limited) return limited

  const url = new URL(request.url)
  const resolvedWindow = resolveOgPhotoPreflightWindow(
    url.searchParams.get("window")
  )
  if (!resolvedWindow.ok) {
    return NextResponse.json({ error: resolvedWindow.error }, { status: 400 })
  }

  // Hitungan yang masih tertahan di memori proses ini ditulis lebih dulu supaya
  // jendela yang dibaca sudah memuat kejadian terakhir — tanpa ini, angka
  // agregat selalu ketinggalan sampai satu menit ke belakang.
  const flush = await flushOgPhotoPreflightSnapshot()

  let aggregate: OgPhotoPreflightWindow | null = null
  let aggregateError: string | null = null
  try {
    aggregate = await readOgPhotoPreflightWindow(resolvedWindow.windowMs)
  } catch (error) {
    // Laporan per proses tetap sah dan tetap disajikan; riwayat yang gagal
    // dibaca dilaporkan sebagai kegagalan tersendiri, bukan sebagai nol.
    console.error("[admin/og-photo] gagal membaca jendela snapshot:", error)
    aggregateError =
      error instanceof Error ? error.message : "kesalahan tidak dikenal"
  }

  const report = ogPhotoPreflightReport()
  const wantsText = url.searchParams.get("format") === "text"

  if (wantsText) {
    const sections = [formatOgPhotoPreflightReportText(report)]

    sections.push(
      aggregate
        ? formatOgPhotoPreflightWindowText(aggregate)
        : `Jendela ${resolvedWindow.label} tidak bisa dibaca: ${aggregateError}`
    )
    sections.push(
      `Penyimpanan snapshot: ${flush.status}${flush.status === "failed" ? ` (${flush.error})` : ""}`
    )

    return new NextResponse(sections.join("\n\n"), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        // Hitungan per proses: jangan pernah di-cache proxy.
        "cache-control": "no-store",
      },
    })
  }

  return NextResponse.json(
    {
      ...report,
      windowLabel: resolvedWindow.label,
      aggregate,
      aggregateError,
      snapshotFlush: flush.status,
    },
    { headers: { "cache-control": "no-store" } }
  )
}
