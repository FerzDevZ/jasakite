import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

/**
 * Keadaan satu slug jasa, dibaca oleh middleware.
 *
 * Endpoint ini SANGAT kecil dengan sengaja: satu kueri berindeks (`slug` unik),
 * satu kolom, tanpa include. Middleware memanggilnya pada setiap permintaan
 * dokumen `/service/<slug>`, jadi biaya per panggilan harus mendekati nol.
 *
 * Kenapa terpisah dari halaman: middleware berjalan di runtime Edge dan tidak
 * bisa memakai Prisma, sedangkan keputusan 404 harus diambil SEBELUM render
 * dimulai. Route handler ini runtime Node, jadi ia yang menjembatani keduanya.
 *
 * TIDAK memakai rate limit, dan itu disengaja: pemanggilnya adalah middleware,
 * satu panggilan per tampilan halaman. Limiter berbasis IP di sini akan berubah
 * menjadi soft 404 (halaman asli ikut ditolak) begitu satu crawler menjelajah
 * banyak jasa dalam satu menit — persis regresi yang sedang diperbaiki. Paparan
 * penyalahgunaan tidak bertambah: `/service/<slug>` sendiri sudah mengungkap
 * keberadaan jasa lewat status HTTP-nya.
 */
export const dynamic = "force-dynamic"

type ServiceState = "active" | "inactive" | "missing"

function respond(state: ServiceState) {
  return NextResponse.json(
    { state },
    {
      // Jangan pernah di-cache di CDN: jasa yang baru diaktifkan harus langsung
      // terbaca sebagai aktif. Cache per-permintaan ditangani middleware.
      headers: { "cache-control": "no-store" },
    }
  )
}

export async function GET(request: Request) {
  const slug = (new URL(request.url).searchParams.get("slug") ?? "").trim()

  // Slug di luar pola tidak mungkin ada di database. Jangan buang kueri.
  if (!/^[a-z0-9][a-z0-9-]{0,198}$/i.test(slug)) return respond("missing")

  try {
    const service = await prisma.service.findUnique({
      where: { slug },
      select: { status: true },
    })

    if (!service) return respond("missing")
    return respond(service.status === "ACTIVE" ? "active" : "inactive")
  } catch (error) {
    console.error("[service-resolve] gagal membaca status jasa:", error)
    // 500, bukan "missing": middleware memperlakukan galat sebagai izin lewat
    // (fail open) supaya gangguan database tidak mengubah halaman sehat menjadi
    // 404 bagi semua pengunjung.
    return NextResponse.json({ error: "Gagal membaca status jasa" }, { status: 500 })
  }
}
