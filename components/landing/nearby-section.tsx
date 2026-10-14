"use client"

import * as React from "react"
import Link from "next/link"
import { MapPinned, Loader2, MapPin } from "lucide-react"
import { toast } from "@/lib/toast-dynamic"
import { nearestCity } from "@/lib/geo"
import { REGENCIES } from "@/lib/provinces"

/**
 * Feed "Di sekitar Anda".
 *
 * Kejujuran data: database tidak menyimpan koordinat penyedia, sehingga
 * jarak user→tukang mustahil dihitung. Yang dihitung adalah jarak user→pusat
 * kabupaten/kota terdekat, lalu pengguna dibawa ke /services?location=<daerah>
 * — filter katalog yang memang ada. Label selalu menyebut "daerah terdekat",
 * tidak pernah "jasa terdekat X km".
 *
 * Geolokasi hanya dipicu oleh aksi pengguna (tombol), tidak otomatis saat
 * halaman dimuat — menghormati privasi dan menghindari prompt menakutkan.
 */
export function NearbySection({ cityCount }: { cityCount: number }) {
  const [locating, setLocating] = React.useState(false)

  const locate = () => {
    if (!("geolocation" in navigator)) {        toast.error("Perangkat tidak mendukung lokasi", {
          description: "Pilih kabupaten/kota dari daftar di bawah sebagai gantinya.",
        })
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const result = nearestCity(pos.coords.latitude, pos.coords.longitude)
        if (!result) {
          toast.error("Lokasi tidak terbaca", {
            description: "Coba pilih kabupaten/kota manual dari daftar.",
          })
          return
        }
        const km = Math.round(result.km)
        toast.success(`Daerah terdekat: ${result.city.label}`, {
          description:
            km < 1
              ? "Berada di sekitar Anda — menampilkan jasa daerah ini."
              : `Sekitar ${km} km dari posisi Anda — menampilkan jasa daerah ini.`,
        })
        window.location.href = `/services?location=${encodeURIComponent(result.city.area)}`
      },
      () => {
        setLocating(false)
        toast.error("Izin lokasi ditolak", {
          description: "Pilih kabupaten/kota manual dari daftar di bawah.",
        })
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 }
    )
  }

  // Daerah dari katalog — chip yang benar-benar membawa filter nyata, bukan
  // daftar kota nasional yang tidak punya penyedia sama sekali.
  const popular: { label: string; area: string }[] = REGENCIES.map((r) => ({
    label: r.capital,
    area: r.name,
  }))

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Di sekitar Anda
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Temukan penyedia di kabupaten/kota terdekat — {cityCount} daerah
            se-Kepulauan Bangka Belitung.
          </p>
        </div>
        <button
          type="button"
          onClick={locate}
          disabled={locating}
          className="focus-ring inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
        >
          {locating ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <MapPinned className="h-4 w-4" aria-hidden />
          )}
          {locating ? "Mencari daerah…" : "Daerah terdekat saya"}
        </button>
      </div>

      <ul className="flex snap-x gap-3 overflow-x-auto pb-2 md:flex-wrap md:overflow-visible md:pb-0">
        {popular.map((city) => (
          <li key={city.area} className="shrink-0 snap-start md:shrink">
            <Link
              href={`/services?location=${encodeURIComponent(city.area)}`}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary-strong"
            >
              <MapPin className="h-3.5 w-3.5 text-primary-strong" aria-hidden />
              {city.label}
            </Link>
          </li>
        ))}
        <li className="shrink-0 md:shrink">
          <Link
            href="/services"
            className="focus-ring inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary-strong transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            Lihat semua daerah
          </Link>
        </li>
      </ul>
    </div>
  )
}
