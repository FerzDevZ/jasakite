import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Indikator langkah untuk alur bertahap (checkout tiga langkah).
 *
 * Aturan yang dipegang: langkah yang sudah dilewati bisa diklik untuk kembali,
 * langkah yang belum tercapai tidak — mencegah pengguna melompati pemilihan
 * alamat lalu gagal di pembayaran.
 */
export function Stepper({
  steps,
  current,
  onStepClick,
  ariaLabel = "Langkah pengisian",
}: {
  steps: readonly { key: string; label: string }[]
  current: number
  onStepClick?: (index: number) => void
  ariaLabel?: string
}) {
  return (
    <ol aria-label={ariaLabel} className="flex items-center gap-2">
      {steps.map((step, i) => {
        const done = i < current
        const active = i === current
        const clickable = Boolean(onStepClick) && i < current
        return (
          <li key={step.key} className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  done && "bg-success text-success-foreground",
                  active && "bg-primary text-primary-foreground",
                  !done && !active && "border border-border bg-card text-muted-foreground"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
              </span>
              <button
                type="button"
                disabled={!clickable}
                onClick={clickable ? () => onStepClick?.(i) : undefined}
                className={cn(
                  "truncate text-left text-xs font-semibold",
                  clickable && "focus-ring rounded hover:underline",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </button>
            </div>
            {i < steps.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "h-px min-w-3 flex-1 rounded-full",
                  done ? "bg-success" : "bg-border"
                )}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
