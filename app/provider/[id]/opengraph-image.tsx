import { ImageResponse } from "next/og"
import { prisma } from "@/lib/prisma"
import { prismaId } from "@/lib/ids"
import { SITE_URL } from "@/lib/site-url"
import { ShareCard, SHARE_CARD_SIZE } from "@/components/og/share-card"
import { isImageReachable } from "@/lib/og-photo-preflight"
import { flushOgPhotoPreflightSnapshot } from "@/lib/og-photo-preflight-snapshot"
import {
  buildFallbackProviderOgViewModel,
  buildProviderOgViewModel,
  type ProviderOgViewModel,
} from "@/lib/provider-og"

/**
 * OG image dinamis per penyedia: avatar, nama, jumlah jasa aktif, rating, dan
 * branding JASAKITE — supaya share profil penyedia ke WhatsApp tampil sebagai
 * kartu preview, bukan teks tautan kosong.
 *
 * Statistik dihitung dari agregat, sama seperti halaman profilnya: `take: 12`
 * pada daftar jasa dan `take: 20` pada daftar ulasan tidak boleh dipakai
 * sebagai angka total (kartu bisa menampilkan "12 jasa aktif" untuk penyedia
 * yang punya 30).
 *
 * Tampilan kartunya ada di `@/components/og/share-card` (dipakai bersama
 * kartu jasa).
 */

export const alt = "Preview penyedia jasa di JASAKITE"
export const size = SHARE_CARD_SIZE
export const contentType = "image/png"

export default async function ProviderOpengraphImage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const providerId = prismaId(id)

  let viewModel: ProviderOgViewModel
  try {
    const user = await prisma.user.findUnique({
      where: { id: providerId },
      select: { name: true, role: true, location: true, avatarUrl: true },
    })

    // Aturan yang sama dengan generateMetadata halaman profil: id pelanggan
    // bukan halaman publik.
    if (!user || user.role === "CUSTOMER") {
      viewModel = buildFallbackProviderOgViewModel()
    } else {
      const [serviceCount, totalReviews, reviewAggregate, completedOrders] =
        await Promise.all([
          prisma.service.count({
            where: { providerId, status: "ACTIVE" },
          }),
          prisma.review.count({
            where: { order: { service: { providerId, status: "ACTIVE" } } },
          }),
          prisma.review.aggregate({
            where: { order: { service: { providerId, status: "ACTIVE" } } },
            _avg: { rating: true },
          }),
          // Pesanan selesai adalah sinyal kepercayaan yang bisa dibuktikan, dan
          // dihitung dari agregat — `take` pada daftar pesanan tidak dipakai.
          prisma.order.count({
            where: { service: { providerId }, status: "COMPLETED" },
          }),
        ])

      viewModel = buildProviderOgViewModel(
        {
          name: user.name,
          location: user.location,
          avatarUrl: user.avatarUrl,
          ratingAvg: reviewAggregate._avg.rating ?? 0,
          totalReviews,
          serviceCount,
          completedOrders,
          shareUrl: `${SITE_URL}/provider/${id}`,
        },
        SITE_URL
      )
    }
  } catch (error) {
    // id yang bukan ObjectId valid membuat Prisma melempar, dan kegagalan DB
    // sesaat (mis. resolusi DNS SRV Atlas) pernah terjadi. Untuk og:image,
    // kartu merek jauh lebih berguna daripada route 500 tanpa preview —
    // errornya tetap dicatat ke log server.
    console.error(
      "[og/provider] gagal memuat penyedia, memakai kartu fallback:",
      error
    )
    viewModel = buildFallbackProviderOgViewModel()
  }

  const imageSrc =
    viewModel.imageSrc && (await isImageReachable(viewModel.imageSrc))
      ? viewModel.imageSrc
      : null

  // Sama seperti kartu jasa: riwayat ditulis dari jalur render, bukan dari jalur
  // admin — instance yang melayani crawler belum tentu pernah dibuka siapa pun.
  await flushOgPhotoPreflightSnapshot()

  return new ImageResponse(
    <ShareCard
      content={{
        title: viewModel.title,
        titleFontSize: viewModel.titleFontSize,
        badgeLabel: viewModel.badgeLabel,
        highlightLabel: viewModel.highlightLabel,
        ratingLabel: viewModel.ratingLabel,
        trustLabel: viewModel.trustLabel,
        footerLabel: viewModel.locationLabel,
        monogram: viewModel.monogram,
        imageSrc,
        qrValue: viewModel.qrValue,
        qrLabel: viewModel.qrLabel,
      }}
    />,
    size
  )
}
