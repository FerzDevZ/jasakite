/**
 * Preflight foto kartu Open Graph: cek HEAD ke URL foto/avatar sebelum kartu
 * dirender, plus hitungan kegagalannya.
 *
 * Kenapa ada: satori melempar bila `<img>` gagal diunduh, jadi kartu yang
 * fotonya tidak bisa diambil harus jatuh ke panel monogram — bukan balas 500
 * yang membuat `og:image` hilang sama sekali. Fallback itu sendiri tetap
 * mengembalikan HTTP 200 berisi PNG sah, sehingga tidak ada status respons yang
 * membedakannya dari kartu berfoto. Satu-satunya cara tahu foto hilang adalah
 * mencatatnya, dan itulah yang dilakukan modul ini: satu baris log per
 * percobaan **plus** hitungan per alasan yang bisa dibaca tanpa membedah log
 * (`ogPhotoPreflightReport`).
 *
 * Hitungan saja masih menuntut ada yang membukanya. Karena itu modul ini juga
 * menaikkan sinyal yang bisa memicu alarm sendiri: saat foto gagal **berurutan**
 * ia menulis satu baris `[og/foto][ALERT]`, dan satu baris
 * `[og/foto][ALERT-CLEARED]` saat pulih. Markernya sengaja stabil supaya
 * `journalctl`, Loki, atau `grep` bisa memicunya tanpa vendor observability
 * baru — dan hanya ditulis sekali per episode, supaya CDN yang mati sepuluh
 * menit tidak membanjiri log sampai alarmnya diabaikan.
 *
 * Pemisahan dari komponen kartu (`components/og/share-card.tsx` yang hanya
 * menggambar) disengaja: route admin bisa membaca keadaan ini tanpa ikut
 * menarik JSX satori ke bundelnya.
 *
 * KEADAAN INI PER PROSES, seperti rate limiter dan penanda "sedang mengetik".
 * Di VPS satu node, angkanya adalah keseluruhan trafik; di deployment
 * multi-instance (mis. Vercel), tiap instance melaporkan bagiannya sendiri dan
 * angka dari satu instance BUKAN total platform. Karena itu laporan selalu
 * membawa `scope: "process"` — supaya tidak dibaca sebagai angka global.
 *
 * Batas itu yang ditutup `@/lib/og-photo-preflight-snapshot`: delta hitungan di
 * sini ditulis ke Mongo secara berkala (dan segera saat ada kegagalan), lalu
 * dijumlahkan antar-instance untuk satu jendela waktu.
 */

/**
 * Batas tunggu preflight. Diukur: TLS+DNS dingin ke images.unsplash.com butuh
 * ~5,6 detik dari Node (permintaan berikutnya <1 detik). Batas 4 detik membuat
 * foto terlewat pada render pertama; 8 detik memberi ruang sambil tetap
 * membatasi route. Biayanya jarang terasa: respons produksi di-cache satu tahun
 * (immutable), jadi lambat hanya pada render pertama tiap foto.
 */
const IMAGE_PREFLIGHT_TIMEOUT_MS = 8_000

/**
 * Umur cache hasil preflight. Foto yang berhasil diambil disimpan lama (10
 * menit) karena URL-nya dipakai berulang: satu avatar penyedia muncul di
 * puluhan kartu jasa, dan crawler (WhatsApp, Telegram, Facebook) meminta kartu
 * yang sama berkali-kali.
 *
 * Kegagalan justru disimpan sebentar (30 detik). CDN yang sempat timeout tidak
 * boleh menyembunyikan foto selama 10 menit — 30 detik cukup untuk menyerap
 * satu ledakan permintaan tanpa memaksa tiap render membayar timeout penuh.
 */
export const PHOTO_REACHABLE_TTL_MS = 10 * 60 * 1_000
export const PHOTO_UNREACHABLE_TTL_MS = 30 * 1_000

/**
 * Jaring pengaman memori: satu URL foto = satu entri kecil, tapi Map tidak
 * boleh tumbuh tanpa batas pada katalog besar.
 */
const MAX_TRACKED_PHOTOS = 1_000

/**
 * Batas hitungan yang disimpan: katalog yang ramai bisa punya ribuan host
 * (masing-masing penyedia menyimpan fotonya di tempat berbeda), dan hitungan
 * yang tidak dibatasi justru jadi kebocoran memori baru. Yang dibuang adalah
 * host paling lama muncul — host yang masih gagal akan kembali masuk sendiri
 * pada kegagalan berikutnya.
 */
export const MAX_TRACKED_FAILING_HOSTS = 50

/** Kegagalan terakhir yang disimpan utuh untuk ditampilkan di laporan. */
export const MAX_RECENT_FAILURES = 10

/**
 * Jendela "baru saja gagal". Kegagalan lebih tua dari ini tidak lagi membuat
 * status laporan jadi degradasi.
 */
export const DEGRADED_WINDOW_MS = 15 * 60 * 1_000

/**
 * Ambang alert: berapa kegagalan **berurutan** sebelum dinyatakan sebagai
 * masalah, bukan sekadar derau.
 *
 * Satu kegagalan terisolasi sudah berarti satu foto hilang dari satu kartu,
 * tapi belum tentu berita untuk operator — CDN yang berkedip sesekali akan
 * membuat alarm ini diabaikan. Dua kegagalan berurutan (tanpa satu pun
 * keberhasilan di antaranya) berarti dua kartu berbagi berturut-turut tampil
 * tanpa foto, dan itulah yang layak dinaikkan.
 */
export const ALERT_CONSECUTIVE_FAILURES = 2

type PhotoReachability = {
  reachable: boolean
  /** Epoch ms saat entri ini berhenti dipakai. */
  expiresAt: number
}

/** Alasan kegagalan preflight, dipakai di log dan hitungan per jenis. */
export type PreflightFailureReason = "http" | "timeout" | "network"

export type PreflightFailure = {
  at: number
  url: string
  host: string
  reason: PreflightFailureReason
  /** Kode HTTP saat CDN menolak; null untuk timeout dan kegagalan jaringan. */
  status: number | null
  elapsedMs: number
  /** Kode penyebab asli bila ada (`ENOTFOUND`, `UND_ERR_SOCKET`, ...). */
  error: string | null
}

export type OgPhotoPreflightVerdict =
  | "unknown"
  | "healthy"
  | "degraded"
  | "failing"

export type OgPhotoPreflightReport = {
  /** Laporan ini hanya mencakup satu proses, bukan seluruh deployment. */
  scope: "process"
  generatedAt: string
  /** Umur proses saat laporan dibuat — jendela yang diwakili hitungan ini. */
  processAgeMs: number
  verdict: OgPhotoPreflightVerdict
  attempts: {
    /** Percobaan HEAD sungguhan; pemakaian cache dan dedupe tidak dihitung. */
    total: number
    reachable: number
    unreachable: number
  }
  failures: {
    total: number
    byReason: Record<PreflightFailureReason, number>
    byStatus: Record<string, number>
  }
  failingHosts: {
    host: string
    failures: number
    lastFailureAt: string
  }[]
  recentFailures: {
    at: string
    host: string
    url: string
    reason: PreflightFailureReason
    status: number | null
    elapsedMs: number
    error: string | null
  }[]
  cache: {
    entries: number
    maxEntries: number
    /** Pemakaian cache: inilah yang membuat render berikutnya tidak mengulang HEAD. */
    servedFromCache: number
    /** Permintaan bersamaan untuk URL yang sama yang menumpang satu HEAD. */
    dedupedInFlight: number
    reachableTtlMs: number
    unreachableTtlMs: number
  }
  lifetime: {
    lastFailureAt: string | null
    lastSuccessAt: string | null
    /** Usia kegagalan terakhir; null bila belum pernah gagal. */
    msSinceLastFailure: number | null
  }
  /**
   * Episode alert, bukan jumlah kegagalan: inilah bentuk yang bisa dipicu
   * monitoring tanpa membaca log — `activeSince` terisi selama foto sedang
   * hilang berulang, dan kosong lagi setelah percobaan berikutnya berhasil.
   */
  alerts: {
    raised: number
    cleared: number
    activeSince: string | null
    consecutiveFailures: number
    threshold: number
  }
}

/**
 * Bentuk delta yang dikirim ke penyimpanan (dan dijumlahkan kembali dari sana).
 *
 * Sengaja datar dan angka semua: satu baris Mongo per flush, tanpa array objek
 * bersarang yang harus di-merge manual saat dijumlahkan antar-instance.
 */
export type OgPhotoPreflightDelta = {
  attempts: number
  reachable: number
  unreachable: number
  failuresHttp: number
  failuresTimeout: number
  failuresNetwork: number
  servedFromCache: number
  dedupedInFlight: number
  alertsRaised: number
  alertsCleared: number
}

/**
 * Urutan kunci yang dipakai semua penjumlahan. Diekspor supaya modul penyimpanan
 * menjumlahkan delta dengan daftar yang sama persis — kunci yang lupa
 * ditambahkan di satu tempat akan tampak sebagai angka yang hilang tanpa error.
 */
export const OG_PHOTO_PREFLIGHT_DELTA_KEYS = [
  "attempts",
  "reachable",
  "unreachable",
  "failuresHttp",
  "failuresTimeout",
  "failuresNetwork",
  "servedFromCache",
  "dedupedInFlight",
  "alertsRaised",
  "alertsCleared",
] as const satisfies readonly (keyof OgPhotoPreflightDelta)[]

export function emptyOgPhotoPreflightDelta(): OgPhotoPreflightDelta {
  return {
    attempts: 0,
    reachable: 0,
    unreachable: 0,
    failuresHttp: 0,
    failuresTimeout: 0,
    failuresNetwork: 0,
    servedFromCache: 0,
    dedupedInFlight: 0,
    alertsRaised: 0,
    alertsCleared: 0,
  }
}

/**
 * Hitungan yang SUDAH dilaporkan ke penyimpanan. Delta = hitungan proses ini
 * dikurangi angka di sini, jadi tidak ada percobaan yang dilaporkan dua kali
 * saat flush berikutnya.
 */
let reportedCounters: OgPhotoPreflightDelta = emptyOgPhotoPreflightDelta()

/** Hitungan kumulatif proses ini dalam bentuk delta (tanpa mengurangi apa pun). */
function cumulativeCounters(): OgPhotoPreflightDelta {
  return {
    attempts: counters.attempts,
    reachable: counters.reachable,
    unreachable: counters.unreachable,
    failuresHttp: counters.failuresByReason.http,
    failuresTimeout: counters.failuresByReason.timeout,
    failuresNetwork: counters.failuresByReason.network,
    servedFromCache: counters.servedFromCache,
    dedupedInFlight: counters.dedupedInFlight,
    alertsRaised: counters.alertsRaised,
    alertsCleared: counters.alertsCleared,
  }
}

/**
 * Bagian hitungan yang belum pernah dilaporkan. Tidak mengubah keadaan apa pun:
 * pemanggil memakai ini untuk MEMUTUSKAN perlu menulis, dan keputusan itu tidak
 * boleh menghabiskan delta — kalau tulisnya ditunda, angkanya harus tetap ada.
 */
export function ogPhotoPreflightDelta(): OgPhotoPreflightDelta {
  const current = cumulativeCounters()
  const delta = emptyOgPhotoPreflightDelta()
  for (const key of OG_PHOTO_PREFLIGHT_DELTA_KEYS) {
    delta[key] = current[key] - reportedCounters[key]
  }
  return delta
}

/**
 * Ambil delta untuk ditulis SEKALIGUS menandainya sudah dilaporkan.
 *
 * Kembalian dan penandaan terjadi tanpa `await` di antaranya, jadi tidak ada
 * percobaan yang bisa terselip di tengah dan hilang dari kedua sisi. Kalau
 * penulisannya gagal, pemanggil wajib memanggil `restoreOgPhotoPreflightDelta`
 * — kegagalan penyimpanan tidak boleh menghapus buktinya.
 */
export function drainOgPhotoPreflightDelta(): OgPhotoPreflightDelta {
  const delta = ogPhotoPreflightDelta()
  reportedCounters = cumulativeCounters()
  return delta
}

/** Kembalikan delta yang gagal ditulis supaya ikut terangkat pada flush berikutnya. */
export function restoreOgPhotoPreflightDelta(
  delta: OgPhotoPreflightDelta
): void {
  for (const key of OG_PHOTO_PREFLIGHT_DELTA_KEYS) {
    reportedCounters[key] = Math.max(0, reportedCounters[key] - delta[key])
  }
}

/** Ada sesuatu untuk dilaporkan? Delta nol berarti tidak ada trafik baru. */
export function hasOgPhotoPreflightActivity(
  delta: OgPhotoPreflightDelta
): boolean {
  return OG_PHOTO_PREFLIGHT_DELTA_KEYS.some((key) => delta[key] !== 0)
}

const reachabilityCache = new Map<string, PhotoReachability>()

/**
 * Preflight yang sedang berjalan, per URL. Dua crawler yang meminta kartu sama
 * pada saat yang sama hanya memicu satu HEAD — tanpa ini keduanya membayar
 * timeout penuh saat CDN sedang lambat.
 */
const inFlightPreflights = new Map<string, Promise<boolean>>()

type ProcessCounters = {
  attempts: number
  reachable: number
  unreachable: number
  servedFromCache: number
  dedupedInFlight: number
  failuresByReason: Record<PreflightFailureReason, number>
  failuresByStatus: Map<number, number>
  failuresByHost: Map<string, { failures: number; lastFailureAt: number }>
  /** Terbaru lebih dulu, dipangkas di MAX_RECENT_FAILURES. */
  recentFailures: PreflightFailure[]
  lastFailureAt: number | null
  lastSuccessAt: number | null
  lastOutcome: "reachable" | "unreachable" | null
  /**
   * Kegagalan berurutan lintas URL — dasar alert. Sengaja lintas URL: CDN yang
   * mati menggagalkan banyak URL berbeda, jadi hitungan per URL justru
   * menyembunyikan masalah yang sedang terjadi.
   */
  consecutiveUnreachable: number
  /** Kapan rentetan kegagalan yang sedang berjalan dimulai. */
  streakStartedAt: number | null
  /** Kapan episode alert berjalan dinaikkan; null = tidak sedang alert. */
  alertingSince: number | null
  alertsRaised: number
  alertsCleared: number
}

function createCounters(): ProcessCounters {
  return {
    attempts: 0,
    reachable: 0,
    unreachable: 0,
    servedFromCache: 0,
    dedupedInFlight: 0,
    failuresByReason: { http: 0, timeout: 0, network: 0 },
    failuresByStatus: new Map(),
    failuresByHost: new Map(),
    recentFailures: [],
    lastFailureAt: null,
    lastSuccessAt: null,
    lastOutcome: null,
    consecutiveUnreachable: 0,
    streakStartedAt: null,
    alertingSince: null,
    alertsRaised: 0,
    alertsCleared: 0,
  }
}

let counters = createCounters()

/** Umur proses — jendela yang sebenarnya diwakili seluruh hitungan di atas. */
const startedAt = Date.now()

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return "url-tidak-valid"
  }
}

/**
 * Kegagalan preflight TIDAK boleh senyap: kartu tetap balas HTTP 200 berisi
 * PNG yang sah, hanya panelnya berisi monogram — jadi tidak ada status respons
 * yang membedakannya, dan yang terlihat orang di WhatsApp adalah kartu tanpa
 * foto. Satu baris log per percobaan (bukan per pemakaian cache) berisi URL,
 * alasan, dan durasinya.
 */
function logUnreachablePhoto(
  url: string,
  reason: PreflightFailureReason,
  startedAt: number,
  status: number | null,
  error?: unknown
): void {
  const errorDetail = describeFetchFailure(error)

  console.warn("[og/foto] preflight gagal, kartu akan memakai monogram:", {
    url,
    reason,
    status,
    elapsedMs: Date.now() - startedAt,
    ...(errorDetail ? { error: errorDetail } : {}),
  })
}

/** `AbortSignal.timeout` melempar DOMException bernama TimeoutError. */
function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  )
}

/**
 * `fetch` hanya bilang "fetch failed" — penyebab sebenarnya (ENOTFOUND,
 * ECONNREFUSED, CERT_HAS_EXPIRED, ...) ada di `cause`. Tanpa itu log kegagalan
 * tidak bisa dibedakan antara DNS mati dan sertifikat kedaluwarsa.
 */
function describeFetchFailure(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined

  const cause = error.cause
  if (!(cause instanceof Error)) return error.message

  const causeCode = (cause as { code?: string }).code
  if (!causeCode) return `${error.message} (${cause.message})`
  return `${error.message} (${causeCode})`
}

function recordAttempt(): void {
  counters.attempts++
}

/** Host dengan kegagalan terbanyak — konteks termurah untuk satu baris alert. */
function topFailingHost(): { host: string; failures: number } | null {
  let top: { host: string; failures: number } | null = null
  for (const [host, entry] of counters.failuresByHost) {
    if (!top || entry.failures > top.failures) {
      top = { host, failures: entry.failures }
    }
  }
  return top
}

/**
 * Alert dinaikkan SEKALI per episode. Baris log per kegagalan akan membanjiri
 * log saat CDN mati sepuluh menit, dan alarm yang membanjiri log cepat atau
 * lambat diabaikan — persis kebalikan dari tujuannya. Marker `[og/foto][ALERT]`
 * sengaja stabil supaya `journalctl`, Loki, atau `grep` bisa memicunya tanpa
 * vendor observability baru.
 */
function maybeRaisePreflightAlert(at: number): void {
  if (counters.alertingSince !== null) return
  if (counters.consecutiveUnreachable < ALERT_CONSECUTIVE_FAILURES) return

  counters.alertingSince = counters.streakStartedAt ?? at
  counters.alertsRaised++

  const lastFailure = counters.recentFailures[0]
  console.warn(
    "[og/foto][ALERT] preflight foto gagal berulang, kartu tampil tanpa foto:",
    {
      consecutiveFailures: counters.consecutiveUnreachable,
      streakStartedAt: new Date(counters.alertingSince).toISOString(),
      attempts: counters.attempts,
      failures: { ...counters.failuresByReason },
      topFailingHost: topFailingHost(),
      lastFailure: lastFailure
        ? {
            host: lastFailure.host,
            reason: lastFailure.reason,
            error: lastFailure.error,
          }
        : null,
    }
  )
}

/**
 * Pemulihan hanya dilaporkan kalau memang sedang alert — bukan setiap kali ada
 * percobaan yang berhasil. Tanpa syarat itu, satu baris "pulih" akan muncul di
 * antara ribuan render normal dan tenggelam bersama log lainnya.
 */
function clearPreflightAlertIfActive(at: number, failedStreak: number): void {
  const alertingSince = counters.alertingSince
  if (alertingSince === null) return

  counters.alertingSince = null
  counters.alertsCleared++

  console.info("[og/foto][ALERT-CLEARED] preflight foto pulih:", {
    alertDurationMs: at - alertingSince,
    alertingSince: new Date(alertingSince).toISOString(),
    failuresInStreak: failedStreak,
    attempts: counters.attempts,
  })
}

function recordOutcome(reachable: boolean, at: number): void {
  if (reachable) {
    counters.reachable++
    counters.lastSuccessAt = at
    counters.lastOutcome = "reachable"
    const failedStreak = counters.consecutiveUnreachable
    counters.consecutiveUnreachable = 0
    counters.streakStartedAt = null
    clearPreflightAlertIfActive(at, failedStreak)
    return
  }

  counters.unreachable++
  counters.lastFailureAt = at
  counters.lastOutcome = "unreachable"
  if (counters.streakStartedAt === null) counters.streakStartedAt = at
  counters.consecutiveUnreachable++
  maybeRaisePreflightAlert(at)
}

function recordFailure(
  url: string,
  reason: PreflightFailureReason,
  status: number | null,
  elapsedMs: number,
  errorDetail: string | undefined,
  at: number
): void {
  counters.failuresByReason[reason]++

  if (status !== null) {
    counters.failuresByStatus.set(
      status,
      (counters.failuresByStatus.get(status) ?? 0) + 1
    )
  }

  const host = hostOf(url)
  const hostEntry = counters.failuresByHost.get(host)
  counters.failuresByHost.set(host, {
    failures: (hostEntry?.failures ?? 0) + 1,
    lastFailureAt: at,
  })
  pruneFailingHosts()

  counters.recentFailures.unshift({
    at,
    url,
    host,
    reason,
    status,
    elapsedMs,
    error: errorDetail ?? null,
  })
  if (counters.recentFailures.length > MAX_RECENT_FAILURES) {
    counters.recentFailures.length = MAX_RECENT_FAILURES
  }
}

function pruneFailingHosts(): void {
  while (counters.failuresByHost.size > MAX_TRACKED_FAILING_HOSTS) {
    const oldest = counters.failuresByHost.keys().next()
    if (oldest.done) return
    counters.failuresByHost.delete(oldest.value)
  }
}

function pruneReachabilityCache(now: number): void {
  for (const [url, entry] of reachabilityCache) {
    if (entry.expiresAt <= now) reachabilityCache.delete(url)
  }

  // Urutan penyisipan Map = urutan umur, jadi entri terdepan paling tua.
  while (reachabilityCache.size >= MAX_TRACKED_PHOTOS) {
    const oldest = reachabilityCache.keys().next()
    if (oldest.done) return
    reachabilityCache.delete(oldest.value)
  }
}

async function preflightPhoto(url: string): Promise<boolean> {
  const attemptStartedAt = Date.now()
  recordAttempt()

  try {
    const response = await fetch(url, {
      method: "HEAD",
      // Cache Next sengaja dilewati: modul ini yang mengelola umur cache, dan
      // status 403/404 yang ikut tersimpan di sana akan sulit dibersihkan.
      cache: "no-store",
      signal: AbortSignal.timeout(IMAGE_PREFLIGHT_TIMEOUT_MS),
    })

    if (response.ok) {
      recordOutcome(true, Date.now())
      return true
    }

    const elapsedMs = Date.now() - attemptStartedAt
    logUnreachablePhoto(url, "http", attemptStartedAt, response.status)
    recordFailure(url, "http", response.status, elapsedMs, undefined, Date.now())
    recordOutcome(false, Date.now())
    return false
  } catch (error) {
    const reason: PreflightFailureReason = isTimeoutError(error)
      ? "timeout"
      : "network"
    const elapsedMs = Date.now() - attemptStartedAt

    logUnreachablePhoto(url, reason, attemptStartedAt, null, error)
    recordFailure(
      url,
      reason,
      null,
      elapsedMs,
      describeFetchFailure(error),
      Date.now()
    )
    recordOutcome(false, Date.now())
    return false
  }
}

/**
 * Preflight HEAD ke URL foto/avatar. Hasilnya dicache per URL supaya render
 * berikutnya tidak mengulang HEAD, dan permintaan bersamaan untuk URL yang sama
 * berbagi satu percobaan.
 *
 * `now` bisa disuntik — sama seperti store "sedang mengetik" — supaya TTL cache
 * bisa diuji tanpa menunggu waktu nyata.
 */
export async function isImageReachable(
  url: string,
  now: number = Date.now()
): Promise<boolean> {
  const cached = reachabilityCache.get(url)
  if (cached && cached.expiresAt > now) {
    counters.servedFromCache++
    return cached.reachable
  }
  if (cached) reachabilityCache.delete(url)

  const inFlight = inFlightPreflights.get(url)
  if (inFlight) {
    counters.dedupedInFlight++
    return inFlight
  }

  const attempt = preflightPhoto(url)
    .then((reachable) => {
      pruneReachabilityCache(now)
      reachabilityCache.set(url, {
        reachable,
        expiresAt:
          now + (reachable ? PHOTO_REACHABLE_TTL_MS : PHOTO_UNREACHABLE_TTL_MS),
      })
      return reachable
    })
    .finally(() => {
      inFlightPreflights.delete(url)
    })

  inFlightPreflights.set(url, attempt)
  return attempt
}

/**
 * Verdict dari urutan hasil terakhir, bukan dari rasio seumur proses: rasio
 * ikut menghitung kegagalan lama yang sudah pulih, sehingga CDN yang sempat
 * mati pagi hari akan membuat status "degradasi" sepanjang hari.
 *
 * - `failing`: percobaan terakhir gagal — foto sedang hilang sekarang.
 * - `degraded`: percobaan terakhir berhasil, tapi ada kegagalan dalam jendela
 *   DEGRADED_WINDOW_MS — baru saja membaik, layak dilihat.
 * - `healthy`: tidak ada kegagalan dalam jendela itu.
 * - `unknown`: belum ada percobaan sama sekali sejak proses hidup.
 */
function verdictFor(now: number): OgPhotoPreflightVerdict {
  if (counters.attempts === 0) return "unknown"
  if (counters.lastOutcome === "unreachable") return "failing"

  const lastFailureAt = counters.lastFailureAt
  if (lastFailureAt !== null && now - lastFailureAt <= DEGRADED_WINDOW_MS) {
    return "degraded"
  }

  return "healthy"
}

function timestamp(at: number | null): string | null {
  return at === null ? null : new Date(at).toISOString()
}

/**
 * Laporan padat untuk operator dan monitoring: hitungan per alasan, per status
 * HTTP, per host, plus beberapa kegagalan terakhir. Inilah cara membaca
 * kehilangan foto tanpa membedah log mentah.
 *
 * `now` bisa disuntik agar jendela degradasi bisa diuji.
 */
export function ogPhotoPreflightReport(
  now: number = Date.now()
): OgPhotoPreflightReport {
  const failuresByStatus: Record<string, number> = {}
  for (const [status, count] of counters.failuresByStatus) {
    failuresByStatus[String(status)] = count
  }

  const failingHosts = Array.from(counters.failuresByHost.entries())
    .map(([host, entry]) => ({
      host,
      failures: entry.failures,
      lastFailureAt: new Date(entry.lastFailureAt).toISOString(),
    }))
    .sort((a, b) => b.failures - a.failures)

  return {
    scope: "process",
    generatedAt: new Date(now).toISOString(),
    processAgeMs: now - startedAt,
    verdict: verdictFor(now),
    attempts: {
      total: counters.attempts,
      reachable: counters.reachable,
      unreachable: counters.unreachable,
    },
    failures: {
      total: counters.unreachable,
      byReason: { ...counters.failuresByReason },
      byStatus: failuresByStatus,
    },
    failingHosts,
    recentFailures: counters.recentFailures.map((failure) => ({
      ...failure,
      at: new Date(failure.at).toISOString(),
    })),
    cache: {
      entries: reachabilityCache.size,
      maxEntries: MAX_TRACKED_PHOTOS,
      servedFromCache: counters.servedFromCache,
      dedupedInFlight: counters.dedupedInFlight,
      reachableTtlMs: PHOTO_REACHABLE_TTL_MS,
      unreachableTtlMs: PHOTO_UNREACHABLE_TTL_MS,
    },
    lifetime: {
      lastFailureAt: timestamp(counters.lastFailureAt),
      lastSuccessAt: timestamp(counters.lastSuccessAt),
      msSinceLastFailure:
        counters.lastFailureAt === null ? null : now - counters.lastFailureAt,
    },
    alerts: {
      raised: counters.alertsRaised,
      cleared: counters.alertsCleared,
      activeSince: timestamp(counters.alertingSince),
      consecutiveFailures: counters.consecutiveUnreachable,
      threshold: ALERT_CONSECUTIVE_FAILURES,
    },
  }
}

function ageLabel(ms: number | null): string {
  if (ms === null) return "belum pernah"
  const seconds = Math.round(ms / 1_000)
  if (seconds < 60) return `${seconds} dtk lalu`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} mnt lalu`
  return `${Math.round(minutes / 60)} jam lalu`
}

/**
 * Versi teks dari laporan yang sama — untuk dibaca manusia lewat satu perintah
 * tanpa membedah log: status, hitungan per alasan, host yang gagal, dan
 * kegagalan terakhir.
 */
export function formatOgPhotoPreflightReportText(
  report: OgPhotoPreflightReport
): string {
  const lines: string[] = [
    `Preflight foto kartu OG — status: ${report.verdict}`,
    `  cakupan: satu proses, hidup ${Math.round(report.processAgeMs / 60_000)} mnt`,
    `  percobaan: ${report.attempts.total} (${report.attempts.reachable} berhasil, ${report.attempts.unreachable} gagal)`,
    `  kegagalan terakhir: ${ageLabel(report.lifetime.msSinceLastFailure)}`,
    report.alerts.activeSince
      ? `  alert: AKTIF sejak ${report.alerts.activeSince} (${report.alerts.consecutiveFailures} kegagalan berurutan, ambang ${report.alerts.threshold})`
      : `  alert: tidak aktif · ${report.alerts.raised} episode dinaikkan, ${report.alerts.cleared} pulih`,
    `  alasan: http ${report.failures.byReason.http} · timeout ${report.failures.byReason.timeout} · network ${report.failures.byReason.network}`,
    `  cache: ${report.cache.entries} entri · dilayani dari cache ${report.cache.servedFromCache} · dedupe ${report.cache.dedupedInFlight}`,
  ]

  const statusEntries = Object.entries(report.failures.byStatus)
  if (statusEntries.length > 0) {
    lines.push(
      `  status HTTP: ${statusEntries.map(([status, count]) => `${status} ×${count}`).join(", ")}`
    )
  }

  if (report.failingHosts.length > 0) {
    lines.push("  host yang gagal:")
    for (const host of report.failingHosts) {
      lines.push(`    ${host.host} — ${host.failures}× (terakhir ${host.lastFailureAt})`)
    }
  }

  if (report.recentFailures.length > 0) {
    lines.push(`  ${report.recentFailures.length} kegagalan terakhir:`)
    for (const failure of report.recentFailures) {
      const detail = failure.error ? ` ${failure.error}` : ""
      const status = failure.status === null ? failure.reason : failure.status
      lines.push(
        `    ${failure.at} ${status} ${failure.elapsedMs}ms ${failure.host}${detail}`
      )
    }
  }

  return lines.join("\n")
}

/**
 * Hanya untuk pengujian: kosongkan cache, preflight yang berjalan, dan seluruh
 * hitungan — supaya tiap test mulai dari keadaan yang sama.
 */
export function __resetOgPhotoPreflight(): void {
  reachabilityCache.clear()
  inFlightPreflights.clear()
  counters = createCounters()
  reportedCounters = emptyOgPhotoPreflightDelta()
}
