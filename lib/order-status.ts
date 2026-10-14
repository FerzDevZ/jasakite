// Finite State Machine pesanan — satu sumber kebenaran untuk transisi status.
// Dipakai oleh PATCH /api/orders/[id] dan UI dashboard provider agar tombol
// yang ditampilkan tidak pernah menawarkan transisi ilegal.

export const ORDER_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

// Transisi yang diizinkan. COMPLETED & CANCELLED adalah state terminal:
// pesanan yang sudah selesai tidak boleh dibuka kembali karena akan
// mengacaukan jendela ulasan (completedAt) dan agregat rating.
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return TRANSITIONS[status].length === 0
}

export function nextStatuses(status: OrderStatus): readonly OrderStatus[] {
  return TRANSITIONS[status]
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return (
    typeof value === "string" &&
    (ORDER_STATUSES as readonly string[]).includes(value)
  )
}

const LABELS: Record<OrderStatus, string> = {
  PENDING: "Menunggu konfirmasi",
  IN_PROGRESS: "Sedang dikerjakan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
}

export function statusLabel(status: OrderStatus): string {
  return LABELS[status]
}

// Label pendek untuk tabel/daftar padat. Sebelumnya tiap halaman menulis
// versi singkatnya sendiri sehingga pesanan yang sama tampil dengan dua nama.
const SHORT_LABELS: Record<OrderStatus, string> = {
  PENDING: "Menunggu",
  IN_PROGRESS: "Dikerjakan",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
}

export function statusShortLabel(status: OrderStatus): string {
  return SHORT_LABELS[status]
}

// Tone visual status → varian Badge. Empat tone tetap di semua role:
// menunggu = warning, dikerjakan = info, selesai = success, batal = destructive.
export type StatusTone =
  | "warning"
  | "info"
  | "success"
  | "destructive"
  | "muted"

const TONES: Record<OrderStatus, StatusTone> = {
  PENDING: "warning",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "destructive",
}

export function statusTone(status: OrderStatus): StatusTone {
  return TONES[status]
}

// Urutan langkah pada timeline pesanan. CANCELLED tidak masuk karena bukan
// tahap lanjutan — dirender terpisah sebagai jalur gagal.
export const ORDER_STEPS: readonly OrderStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
]

// ── Status jasa (Service.status di schema.prisma) ──────────────────────────
export const SERVICE_STATUSES = ["ACTIVE", "DRAFT", "ARCHIVED"] as const
export type ServiceStatus = (typeof SERVICE_STATUSES)[number]

const SERVICE_LABELS: Record<ServiceStatus, string> = {
  ACTIVE: "Tayang",
  DRAFT: "Draf",
  ARCHIVED: "Diarsipkan",
}

const SERVICE_TONES: Record<ServiceStatus, StatusTone> = {
  ACTIVE: "success",
  DRAFT: "warning",
  ARCHIVED: "muted",
}

export function serviceStatusLabel(status: string): string {
  return SERVICE_LABELS[status as ServiceStatus] ?? status
}

export function serviceStatusTone(status: string): StatusTone {
  return SERVICE_TONES[status as ServiceStatus] ?? "muted"
}

// Pesan error yang bisa langsung ditampilkan ke pengguna.
export function transitionError(from: OrderStatus, to: OrderStatus): string {
  if (from === to) {
    return `Pesanan sudah berstatus "${LABELS[from]}"`
  }
  if (isTerminalStatus(from)) {
    return `Pesanan "${LABELS[from]}" tidak bisa diubah lagi`
  }
  return `Status tidak bisa berubah dari "${LABELS[from]}" ke "${LABELS[to]}"`
}
