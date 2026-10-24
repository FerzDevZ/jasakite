/**
 * Helper murni untuk gerbang 404 rute detail jasa.
 *
 * Dipisahkan dari middleware.ts supaya bisa diuji tanpa membuat NextRequest:
 * middleware hanya berjalan di dalam server Next, jadi logika parsing di sini
 * tidak akan pernah teruji kalau menempel di sana.
 *
 * Kenapa gerbangnya ada di middleware, bukan di page.tsx: root layout membaca
 * sesi (`auth()`), sehingga SEMUA rute dirender dinamis dan di-stream. Header
 * HTTP sudah terkirim sebelum `notFound()` di komponen halaman dievaluasi, dan
 * status 200 tidak bisa ditarik kembali. Middleware berjalan sebelum render
 * dimulai, jadi hanya di situ status masih bisa diputuskan.
 */

/**
 * Rute detail jasa: tepat SATU segmen setelah `/service`.
 *
 * Segmen kedua sengaja ditolak — `/service/<slug>/opengraph-image` adalah route
 * handler gambar, bukan halaman, dan tidak boleh ikut digerbangi (kartu OG
 * justru harus tetap 200 dengan kartu fallback saat jasanya tidak ada).
 */
const SERVICE_DETAIL_PATH = /^\/service\/([^/]+)\/?$/

/** Slug yang sah: huruf, angka, tanda hubung. Tidak ada spasi atau garis miring. */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,198}$/i

export function serviceSlugFromPath(pathname: string): string | null {
  const match = SERVICE_DETAIL_PATH.exec(pathname)
  if (!match) return null

  let slug: string
  try {
    slug = decodeURIComponent(match[1])
  } catch {
    // Persentase encoding rusak (`%E0%A4%A`). Biarkan halaman yang menangani
    // sebagai slug tidak valid — gerbang tidak boleh 500 karena URL aneh.
    return null
  }

  return SLUG_PATTERN.test(slug) ? slug : null
}

/**
 * Permintaan yang tidak menentukan status dokumen.
 *
 * `?_rsc=` dipakai navigasi klien dan prefetch; keduanya mengembalikan payload
 * RSC, bukan dokumen HTML. Pemeriksaan di sini hanya akan menambah satu kueri
 * database per tautan yang di-hover tanpa mengubah apa pun yang dilihat
 * crawler atau monitoring — navigasi dokumen berikutnya tetap diperiksa.
 */
export function isNonDocumentRequest(headers: Headers, searchParams: URLSearchParams): boolean {
  if (searchParams.has("_rsc")) return true
  if (headers.get("next-router-prefetch") === "1") return true
  if (headers.get("x-middleware-prefetch") === "1") return true
  return false
}
