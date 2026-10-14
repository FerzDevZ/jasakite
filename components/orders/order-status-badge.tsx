import { Clock, Hammer, CheckCircle2, XCircle, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  isOrderStatus,
  statusLabel,
  statusShortLabel,
  statusTone,
  serviceStatusLabel,
  serviceStatusTone,
  type OrderStatus,
  type StatusTone,
} from "@/lib/order-status"

const ICONS: Record<OrderStatus, LucideIcon> = {
  PENDING: Clock,
  IN_PROGRESS: Hammer,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
}

/**
 * Badge status pesanan — satu-satunya tempat label, warna, dan ikon status
 * ditentukan. Sebelumnya STATUS_META diduplikasi di enam file sehingga pesanan
 * yang sama tampil "Menunggu Konfirmasi" di satu halaman dan "Menunggu" di
 * halaman lain.
 *
 * `compact` memakai label pendek untuk tabel/daftar padat.
 */
export function OrderStatusBadge({
  status,
  compact = false,
  withIcon = true,
  className,
}: {
  status: string
  compact?: boolean
  withIcon?: boolean
  className?: string
}) {
  if (!isOrderStatus(status)) {
    return (
      <Badge variant="muted" className={className}>
        {status}
      </Badge>
    )
  }

  const Icon = ICONS[status]
  const label = compact ? statusShortLabel(status) : statusLabel(status)

  return (
    // key={status} memaksa remount saat status berubah → animasi fade diputar
    // ulang, memberi isyarat halus "ini berubah" tanpa mengganggu. Kelas
    // animate-content-in berakhir tanpa transform permanen, aman untuk
    // position:fixed di sekitarnya; reduced-motion mematikannya lewat
    // kill-switch global di globals.css.
    <Badge
      key={status}
      variant={statusTone(status)}
      className={cn("shrink-0 animate-content-in", className)}
    >
      {withIcon && <Icon className="h-3.5 w-3.5" aria-hidden />}
      {label}
    </Badge>
  )
}

/** Badge status jasa (ACTIVE / DRAFT / ARCHIVED) dengan tone yang sama. */
export function ServiceStatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  return (
    <Badge
      variant={serviceStatusTone(status) as StatusTone}
      className={cn("shrink-0", className)}
    >
      {serviceStatusLabel(status)}
    </Badge>
  )
}
