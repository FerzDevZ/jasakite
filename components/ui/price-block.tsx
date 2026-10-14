import { cn } from "@/lib/utils"

const idr = new Intl.NumberFormat("id-ID")

/**
 * Tampilan harga tunggal untuk seluruh produk.
 *
 * Sebelumnya setiap kartu/halaman menulis `Intl.NumberFormat("id-ID")` sendiri
 * dan memilih ukuran font sendiri, sehingga harga yang sama bisa tampil berbeda
 * antar layar. Di sini format dan hierarkinya dikunci sekali:
 *  - angka selalu dipisah ribuan gaya Indonesia ("350.000", bukan "350,000");
 *  - "Rp" lebih kecil dari angka supaya harga terbaca sebagai angka;
 *  - `strike` dipakai untuk harga sebelum diskon, dan hanya boleh muncul
 *    bersama harga final (kalau tidak, pengguna melihat dua harga tanpa tahu
 *    mana yang berlaku).
 */
export function PriceBlock({
  amount,
  strike,
  suffix,
  size = "md",
  className,
}: {
  amount: number
  /** Harga sebelum diskon — dirender redup dan dicoret. */
  strike?: number
  /** Satuan setelah harga, mis. "/ selesai". */
  suffix?: string
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}) {
  const showStrike = typeof strike === "number" && strike > amount

  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      {showStrike && (
        <span className="text-2xs font-medium text-muted-foreground line-through tabular-nums">
          Rp{idr.format(strike)}
        </span>
      )}
      <span className="flex items-baseline gap-1 tabular-nums">
        <span
          className={cn(
            "font-semibold text-muted-foreground",
            size === "sm" ? "text-2xs" : "text-xs"
          )}
        >
          Rp
        </span>
        <span
          className={cn(
            "font-extrabold tracking-tight text-primary-strong",
            size === "sm" && "text-sm",
            size === "md" && "text-lg",
            size === "lg" && "text-2xl",
            size === "xl" && "text-3xl"
          )}
        >
          {idr.format(amount)}
        </span>
        {suffix && (
          <span className="text-2xs font-normal text-muted-foreground">{suffix}</span>
        )}
      </span>
    </span>
  )
}
