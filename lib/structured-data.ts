/**
 * Pembangun data terstruktur (JSON-LD) untuk halaman publik.
 *
 * Fungsi di sini sengaja murni (tanpa Prisma/React) agar bisa diuji langsung
 * dan dipakai halaman server mana pun. URL diterima utuh dari pemanggil —
 * sumber kebenaran alamat situs tetap `lib/site-url.ts` — sehingga modul ini
 * tidak membaca environment saat diimpor.
 *
 * Catatan pedoman Google: `aggregateRating` hanya boleh muncul bila benar-benar
 * ada ulasan, dan angkanya harus cocok dengan yang terlihat di halaman.
 */

export type JsonLdNode = Record<string, unknown>

export type BreadcrumbEntry = {
  name: string
  url: string
}

/**
 * URL gambar yang aman dimasukkan ke JSON-LD: hanya http(s). Avatar dan foto
 * unggahan pengguna disimpan sebagai data-URI base64 — menyertakannya akan
 * membengkakkan HTML tanpa manfaat apa pun bagi crawler.
 */
function publicImageUrl(url: string | null | undefined): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null
}

function aggregateRating(
  ratingAvg: number,
  totalReviews: number
): JsonLdNode | null {
  if (totalReviews <= 0) return null
  return {
    "@type": "AggregateRating",
    // Satu desimal, sama seperti angka yang tampil di UI — pedoman Google
    // meminta markup cocok dengan konten yang dilihat pengguna.
    ratingValue: Math.round(ratingAvg * 10) / 10,
    reviewCount: totalReviews,
    bestRating: 5,
    worstRating: 1,
  }
}

/** BreadcrumbList dengan nomor urut otomatis mengikuti urutan item. */
export function breadcrumbJsonLd(items: BreadcrumbEntry[]): JsonLdNode {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: entry.url,
    })),
  }
}

/**
 * JSON.stringify yang aman disisipkan ke `<script type="application/ld+json">`.
 * `<` diubah menjadi escape unicode supaya deskripsi/judul yang ditulis
 * pengguna tidak bisa menutup tag script lebih awal.
 */
export function serializeJsonLd(nodes: JsonLdNode | JsonLdNode[]): string {
  return JSON.stringify(nodes).replace(/</g, "\\u003c")
}

export type ServiceJsonLdInput = {
  title: string
  description: string
  categoryName: string
  url: string
  imageUrl?: string | null
  providerName?: string | null
  providerUrl: string
  price: number
  ratingAvg: number
  totalReviews: number
}

/** Node `Service` untuk halaman detail jasa. */
export function serviceJsonLd(input: ServiceJsonLdInput): JsonLdNode {
  const image = publicImageUrl(input.imageUrl)
  const rating = aggregateRating(input.ratingAvg, input.totalReviews)

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.title,
    description: input.description,
    serviceType: input.categoryName,
    url: input.url,
    ...(image ? { image } : {}),
    provider: {
      "@type": "Organization",
      name: input.providerName ?? "Penyedia JASAKITE",
      url: input.providerUrl,
    },
    areaServed: {
      "@type": "Country",
      name: "Indonesia",
    },
    offers: {
      "@type": "Offer",
      price: input.price,
      priceCurrency: "IDR",
      availability: "https://schema.org/InStock",
      url: input.url,
    },
    ...(rating ? { aggregateRating: rating } : {}),
  }
}

export type ProviderServiceEntry = {
  title: string
  url: string
  price: number
  categoryName: string
}

export type ProviderJsonLdInput = {
  name: string | null
  bio: string | null
  location: string | null
  avatarUrl: string | null
  url: string
  ratingAvg: number
  totalReviews: number
  services: ProviderServiceEntry[]
}

/**
 * Node `ProfilePage` untuk halaman penyedia. `mainEntity` memakai
 * `LocalBusiness` — penyedia JASAKITE adalah usaha jasa lokal (perorangan atau
 * kelompok), dan tipe ini didukung review snippet Google sekaligus mewakili
 * alamat kota serta daftar penawaran jasanya.
 */
export function providerJsonLd(input: ProviderJsonLdInput): JsonLdNode {
  const displayName = input.name ?? "Penyedia JASAKITE"
  const image = publicImageUrl(input.avatarUrl)
  const rating = aggregateRating(input.ratingAvg, input.totalReviews)

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: input.url,
    name: `${displayName} — Penyedia Jasa`,
    mainEntity: {
      "@type": "LocalBusiness",
      name: displayName,
      url: input.url,
      ...(input.bio ? { description: input.bio } : {}),
      ...(image ? { image } : {}),
      ...(input.location
        ? {
            address: {
              "@type": "PostalAddress",
              addressLocality: input.location,
              addressCountry: "ID",
            },
          }
        : {}),
      ...(rating ? { aggregateRating: rating } : {}),
      ...(input.services.length
        ? {
            makesOffer: input.services.map((entry) => ({
              "@type": "Offer",
              price: entry.price,
              priceCurrency: "IDR",
              itemOffered: {
                "@type": "Service",
                name: entry.title,
                category: entry.categoryName,
                url: entry.url,
              },
            })),
          }
        : {}),
    },
  }
}
