import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"
import { SITE_URL } from "@/lib/site-url"
import { ListingCard } from "@/components/og/listing-card"
import {
  buildFallbackServicesOgViewModel,
  buildServicesOgViewModel,
  type ServicesOgViewModel,
} from "@/lib/services-og"
import { SHARE_CARD_SIZE } from "@/components/og/share-card"

/**
 * OG image halaman daftar jasa.
 *
 * Halaman ini yang paling sering disebar ke grup WhatsApp, tapi sebelumnya ia
 * memakai kartu merek statis yang sama dengan halaman tanpa kartu sendiri —
 * sehingga yang terlihat di grup hanyalah tagline. Kartu ini menampilkan angka
 * yang benar-benar ada saat itu: jumlah jasa aktif dan kategori teratas.
 *
 * Agregasi dihitung dari `count`/`groupBy`, bukan dari daftar yang dibatasi
 * `take` di halamannya: kartu tidak boleh menulis \"10 jasa\" hanya karena
 * halamannya memuat sepuluh item pertama.
 */

export const alt = "Kategori jasa lokal di JASAKITE"
export const size = SHARE_CARD_SIZE
export const contentType = "image/png"

/**
 * WAJIB dinamis — kartu ini tidak boleh dipanggang saat `next build`.
 *
 * Tanpa ini Next mem-prerender rutenya (tidak ada parameter dinamis di sini,
 * beda dari kartu jasa/penyedia) dan menulis PNG-nya ke
 * `.next/server/app/services/opengraph-image.body` dengan
 * `initialRevalidateSeconds: false`. Dua akibatnya, dan yang kedua tidak
 * terlihat sampai ada yang menyebar tautannya:
 *
 * 1. Angka "N jasa aktif" dan kategori teratas adalah potret saat build. Di
 *    aplikasi yang jasanya bertambah tiap hari, kartu yang paling sering
 *    disebar ke grup WhatsApp justru yang paling cepat salah — sampai deploy
 *    berikutnya.
 * 2. Kalau build berjalan tanpa database yang terjangkau (env belum disetel,
 *    IP Atlas belum diizinkan, DNS Atlas gagal), yang dipanggang PERMANEN
 *    adalah kartu fallback tanpa angka. Tidak ada error dan tidak ada halaman
 *    rusak, cuma satu baris log saat build — dan laporan runtime tidak bisa
 *    melihatnya karena tidak ada permintaan yang pernah menyentuh database.
 *
 * Ongkosnya tiga kueri agregat per permintaan crawler, bukan per pengunjung:
 * WhatsApp/Facebook/Telegram menyimpan hasil scrape-nya sendiri.
 */
export const dynamic = "force-dynamic"

/** Batas kategori yang diambil dari DB; sisanya diringkas jadi label \"+N\". */
const CATEGORY_SCAN_LIMIT = 40

export default async function ServicesOpengraphImage() {
  const shareUrl = `${SITE_URL}/services`

  let viewModel: ServicesOgViewModel
  try {
    const [activeServiceCount, categoryGroups] = await Promise.all([
      prisma.service.count({ where: { status: "ACTIVE" } }),
      prisma.service.groupBy({
        by: ["categoryId"],
        where: { status: "ACTIVE" },
        _count: { _all: true },
      }),
    ])

    const categoryIds = categoryGroups
      .map((group) => group.categoryId)
      .slice(0, CATEGORY_SCAN_LIMIT)

    const categories =
      categoryIds.length > 0
        ? await prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true },
          })
        : []

    const nameById = new Map(
      categories.map((category) => [String(category.id), category.name])
    )

    viewModel = buildServicesOgViewModel({
      activeServiceCount,
      categories: categoryGroups.flatMap((group) => {
        const name = nameById.get(String(group.categoryId))
        // Kategori yang sudah dihapus tapi jasanya masih tertinggal tidak
        // ditampilkan sebagai petak tanpa nama.
        return name ? [{ name, count: group._count._all }] : []
      }),
      regionLabel: "Kepulauan Bangka Belitung",
      shareUrl,
    })
  } catch (error) {
    // Sama seperti kartu entitas: kegagalan agregasi tidak boleh menghapus
    // og:image. Kartu merek masih punya QR ke halaman yang memang ada.
    console.error(
      "[og/services] gagal menghitung kategori, memakai kartu fallback:",
      error
    )
    viewModel = buildFallbackServicesOgViewModel({
      regionLabel: "Kepulauan Bangka Belitung",
      shareUrl,
    })
  }

  return new ImageResponse(<ListingCard content={viewModel} />, {
    ...size,
    // Kebijakan cache ditulis eksplisit karena bawaan Next untuk rute
    // `opengraph-image` adalah `public, immutable, no-transform,
    // max-age=31536000` — satu tahun, untuk kartu yang isinya berubah setiap
    // ada jasa baru. Diukur pada `next start` sebelum baris ini ada.
    //
    // s-maxage yang menentukan berapa lama CDN Vercel menyimpan (Vercel
    // mengonsumsi direktif ini lalu tidak meneruskannya ke klien); max-age=0
    // supaya browser tidak memegang kartu lama; stale-while-revalidate memberi
    // CDN izin menyegarkan di latar belakang, jadi lonjakan crawler tidak
    // berubah menjadi lonjakan kueri agregat. Batas atas embusannya: ~15 menit
    // (5 menit s-maxage + 10 menit SWR).
    headers: {
      "cache-control":
        "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    },
  })
}
