import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"
import { SITE_URL } from "@/lib/site-url"
import { ShareCard, SHARE_CARD_SIZE } from "@/components/og/share-card"
import { isImageReachable } from "@/lib/og-photo-preflight"
import { flushOgPhotoPreflightSnapshot } from "@/lib/og-photo-preflight-snapshot"
import {
  buildFallbackOgViewModel,
  buildServiceOgViewModel,
  type ServiceOgViewModel,
} from "@/lib/service-og"

/**
 * OG image dinamis per jasa: foto, nama, harga, rating, dan branding JASAKITE.
 * Diresolusi otomatis oleh Next sebagai meta og:image/twitter:image untuk
 * setiap `/service/[slug]` — sehingga share ke WhatsApp tampil sebagai kartu
 * preview menarik, bukan hanya teks tautan kosong.
 *
 * Tampilan kartunya sendiri ada di `@/components/og/share-card` (dipakai
 * bersama kartu penyedia).
 */

export const alt = "Preview jasa di JASAKITE"
export const size = SHARE_CARD_SIZE
export const contentType = "image/png"

export default async function ServiceOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let viewModel: ServiceOgViewModel
  try {
    const service = await prisma.service.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        price: true,
        ratingAvg: true,
        totalReviews: true,
        imageUrl: true,
        category: { select: { name: true } },
        provider: { select: { name: true, city: true } },
      },
    })

    // Hitungan pesanan selesai hanya diambil saat jasanya memang ada: jasa yang
    // tidak ditemukan memakai kartu merek, dan kartu merek tidak mengklaim
    // angka apa pun.
    const completedOrders = service
      ? await prisma.order.count({
          where: { serviceId: service.id, status: "COMPLETED" },
        })
      : 0

    viewModel = service
      ? buildServiceOgViewModel(
          {
            title: service.title,
            categoryName: service.category.name,
            price: service.price,
            ratingAvg: service.ratingAvg,
            totalReviews: service.totalReviews,
            imageUrl: service.imageUrl,
            providerName: service.provider.name,
            providerCity: service.provider.city,
            completedOrders,
            shareUrl: `${SITE_URL}/service/${slug}`,
          },
          SITE_URL
        )
      : buildFallbackOgViewModel()
  } catch (error) {
    // Kegagalan DB sesaat (mis. resolusi DNS SRV Atlas) tidak boleh menghapus
    // og:image sama sekali: route 500 = tidak ada preview di WhatsApp. Kartu
    // merek tetap lebih baik, dan errornya tetap dicatat ke log server.
    console.error("[og/service] gagal memuat jasa, memakai kartu fallback:", error)
    viewModel = buildFallbackOgViewModel()
  }

  const imageSrc =
    viewModel.imageSrc && (await isImageReachable(viewModel.imageSrc))
      ? viewModel.imageSrc
      : null

  // Hitungan proses ini dikirim ke penyimpanan sebelum balasan dikirim: kartu
  // produksi bisa dirender dari instance yang tidak pernah dibuka admin, jadi
  // riwayat tidak boleh bergantung pada ada yang membuka laporan. Throttle di
  // dalamnya menjaga trafik sehat tetap satu tulisan per menit, dan kegagalan
  // menyimpan tidak pernah menggagalkan kartunya.
  await flushOgPhotoPreflightSnapshot()

  return new ImageResponse(
    <ShareCard
      content={{
        title: viewModel.title,
        titleFontSize: viewModel.titleFontSize,
        badgeLabel: viewModel.categoryLabel,
        highlightLabel: viewModel.priceLabel,
        ratingLabel: viewModel.ratingLabel,
        trustLabel: viewModel.trustLabel,
        footerLabel: viewModel.providerLabel,
        monogram: "J",
        imageSrc,
        qrValue: viewModel.qrValue,
        qrLabel: viewModel.qrLabel,
      }}
    />,
    size
  )
}
