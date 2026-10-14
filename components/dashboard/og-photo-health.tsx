"use client"

import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, Camera, CheckCircle2, HelpCircle, ImageOff } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  OG_PHOTO_HEALTH_DETAIL_PATH,
  OG_PHOTO_HEALTH_QUERY_KEY,
  OG_PHOTO_HEALTH_QUERY_PATH,
  ogPhotoHealthRefetchInterval,
  summarizeOgPhotoHealth,
  type OgPhotoHealthResponse,
  type OgPhotoHealthTone,
} from "@/lib/og-photo-health-view"

/**
 * Strip kesehatan preflight foto kartu OG.
 *
 * Kenapa perlu ada di layar: kartu dengan foto yang gagal diambil tetap
 * membalas HTTP 200 berisi PNG sah — panelnya cuma berisi monogram. Tidak ada
 * error rate yang bergerak dan tidak ada halaman yang rusak, jadi satu-satunya
 * cara masalah ini terlihat adalah kalau angkanya ditaruh di tempat admin
 * memang melihat. Endpoint-nya sudah menyediakan angkanya; komponen ini yang
 * membuatnya tidak perlu dicari.
 *
 * Tata letaknya sengaja asimetris: kolom kiri yang lebar membawa verdict dan
 * pecahan alasan kegagalan (yang menentukan tindakan), kolom kanan yang sempit
 * membawa konteks (host teratas, riwayat jendela, tautan laporan teks). Tiga
 * kartu berukuran sama akan menyamakan bobot hal yang tidak sama pentingnya.
 */

const TONE_STYLES: Record<
  OgPhotoHealthTone,
  { pill: string; icon: typeof CheckCircle2 }
> = {
  success: {
    pill: "border-success/40 bg-success-soft text-success",
    icon: CheckCircle2,
  },
  warning: {
    pill: "border-warning/40 bg-warning-soft text-warning",
    icon: AlertTriangle,
  },
  destructive: {
    pill: "border-destructive/40 bg-destructive/10 text-destructive-strong",
    icon: ImageOff,
  },
  muted: {
    pill: "border-border bg-muted text-muted-foreground",
    icon: HelpCircle,
  },
}

export function OgPhotoHealthStrip() {
  const { data, isLoading, isError } = useQuery<OgPhotoHealthResponse>({
    queryKey: OG_PHOTO_HEALTH_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch(OG_PHOTO_HEALTH_QUERY_PATH)
      if (!response.ok) throw new Error("Gagal memuat kesehatan foto kartu")
      return response.json()
    },
    // Lambat saat sehat, rapat saat rusak: lihat `ogPhotoHealthRefetchInterval`.
    refetchInterval: (query) =>
      ogPhotoHealthRefetchInterval(query.state.data as OgPhotoHealthResponse | undefined),
  })

  if (isLoading) {
    return <Skeleton className="h-40 rounded-2xl" />
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden />
          Kesehatan foto kartu OG tidak bisa dibaca saat ini. Kartu yang dibagikan
          tetap tampil — hanya angkanya yang belum tersedia.
        </CardContent>
      </Card>
    )
  }

  const summary = summarizeOgPhotoHealth(data)
  const tone = TONE_STYLES[summary.tone]
  const ToneIcon = tone.icon

  return (
    <Card
      className="overflow-hidden"
      aria-label="Kesehatan foto kartu Open Graph"
    >
      <CardContent className="grid gap-5 p-5 sm:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${tone.pill}`}
            >
              <ToneIcon className="h-3.5 w-3.5" aria-hidden />
              {summary.verdictLabel}
            </span>
            <span className="text-sm text-muted-foreground">
              Preflight foto kartu OG
            </span>
          </div>

          <p className="max-w-prose text-sm leading-relaxed text-foreground">
            {summary.headline}
          </p>

          {summary.alertLabel ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-medium text-destructive-strong">
              {summary.alertLabel}
            </p>
          ) : null}

          <dl className="grid grid-cols-3 gap-3">
            {summary.reasons.map((reason) => {
              const isPresent = reason.count > 0
              return (
                <div
                  key={reason.reason}
                  className="rounded-xl border border-border bg-background px-3 py-2.5"
                >
                  <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {reason.label}
                  </dt>
                  <dd
                    className={`mt-1 text-xl font-extrabold tabular-nums ${
                      isPresent ? "text-destructive-strong" : "text-muted-foreground/60"
                    }`}
                  >
                    {reason.count}
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>

        <div className="space-y-3 border-t border-border pt-4 text-xs text-muted-foreground sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <p className="flex items-start gap-2">
            <Camera className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-strong" aria-hidden />
            <span>
              <span className="block text-foreground">{summary.attemptsLabel}</span>
              <span className="block">{summary.cacheLabel}</span>
            </span>
          </p>

          {summary.topHost ? (
            <p>
              <span className="block text-foreground">Host paling sering gagal</span>
              {summary.topHost}
            </p>
          ) : null}

          {summary.windowSummaryLabel ? (
            <p>
              <span className="block text-foreground">
                Jendela {summary.windowLabel}
              </span>
              {summary.windowSummaryLabel}
            </p>
          ) : null}

          {summary.windowError ? (
            <p className="text-warning">
              Riwayat jendela tidak terbaca: {summary.windowError}
            </p>
          ) : null}

          <a
            href={OG_PHOTO_HEALTH_DETAIL_PATH}
            className="focus-ring inline-flex items-center gap-1 font-medium text-primary-strong hover:underline"
          >
            Laporan lengkap (teks)
            <span aria-hidden>→</span>
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
