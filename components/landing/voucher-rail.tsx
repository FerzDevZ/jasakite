import Link from "next/link"
import { Tag } from "lucide-react"

type Voucher = {
  code: string
  title: string
  description: string | null
  type: string
  value: number
  minSpend: number
  scopeCity: string | null
  endsAt: Date | null
}

const idr = new Intl.NumberFormat("id-ID")

function faceValue(voucher: Voucher): string {
  return voucher.type === "PERCENT"
    ? `Diskon ${voucher.value}%`
    : `Potongan Rp${idr.format(voucher.value)}`
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

/**
 * Rail voucher aktif.
 *
 * Hanya menampilkan voucher yang benar-benar ada di database dan masih berlaku
 * — rail "promo" yang mengiklankan diskon karangan adalah slop, dan lebih buruk
 * lagi: pengguna yang mengejar diskon fiktif akan kecewa di halaman checkout.
 *
 * Klaim tetap terjadi di checkout (server menghitung ulang potongannya), jadi
 * kartu di sini adalah pengumuman syarat — bukan janji harga.
 */
export function VoucherRail({ vouchers }: { vouchers: Voucher[] }) {
  if (vouchers.length === 0) return null

  return (
    <section aria-labelledby="voucher-heading" className="mx-auto max-w-7xl px-4">
      <div className="flex items-end justify-between gap-3">
        <h2
          id="voucher-heading"
          className="text-lg font-bold tracking-tight sm:text-xl"
        >
          Voucher yang bisa dipakai
        </h2>
        <Link
          href="/services"
          className="focus-ring shrink-0 rounded text-xs font-semibold text-primary-strong underline-offset-4 hover:underline"
        >
          Pakai saat checkout
        </Link>
      </div>

      <ul className="no-scrollbar -mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3">
        {vouchers.map((voucher) => (
          <li
            key={voucher.code}
            className="w-[78%] shrink-0 snap-start sm:w-auto"
          >
            <div className="flex h-full items-stretch overflow-hidden rounded-2xl border border-border bg-card">
              {/* Tepi bergerigi oranye: penanda visual "kupon" tanpa gambar. */}
              <div
                aria-hidden
                className="w-1.5 shrink-0 bg-brand-gradient"
              />
              <div className="min-w-0 flex-1 p-3.5">
                <p className="text-sm font-extrabold text-primary-strong">
                  {faceValue(voucher)}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs font-medium">
                  {voucher.title}
                </p>
                <p className="mt-1 text-2xs text-muted-foreground">
                  {voucher.minSpend > 0
                    ? `Min. belanja Rp${idr.format(voucher.minSpend)}`
                    : "Tanpa minimum belanja"}
                  {voucher.scopeCity ? ` · ${titleCase(voucher.scopeCity)}` : ""}
                </p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-foreground/5 px-1.5 py-0.5 font-mono text-2xs font-semibold">
                  <Tag className="h-3 w-3" aria-hidden />
                  {voucher.code}
                </p>
                {voucher.endsAt && (
                  <p className="mt-1.5 text-2xs text-muted-foreground">
                    Berlaku sampai{" "}
                    {new Intl.DateTimeFormat("id-ID", {
                      day: "numeric",
                      month: "long",
                    }).format(new Date(voucher.endsAt))}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
