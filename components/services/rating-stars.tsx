import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

const SIZES = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
} as const

/**
 * Deretan bintang rating read-only. Sebelumnya loop `Array.from({length:5})`
 * dengan kelas warna berbeda disalin di detail jasa, profil provider, dan
 * form ulasan — tiga sumber kebenaran untuk hal yang sama.
 */
export function RatingStars({
  value,
  size = "md",
  showValue = false,
  reviewCount,
  className,
}: {
  value: number
  size?: keyof typeof SIZES
  showValue?: boolean
  reviewCount?: number
  className?: string
}) {
  const rounded = Math.round(value)

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <span
        className="flex items-center gap-0.5"
        role="img"
        aria-label={`Rating ${value.toFixed(1)} dari 5`}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            aria-hidden
            className={cn(
              SIZES[size],
              i < rounded ? "fill-rating text-rating" : "text-muted-foreground/30"
            )}
          />
        ))}
      </span>
      {showValue && (
        <span className="ml-1 font-bold tabular-nums">{value.toFixed(1)}</span>
      )}
      {typeof reviewCount === "number" && (
        <span className="text-muted-foreground">
          ({reviewCount} ulasan)
        </span>
      )}
    </div>
  )
}
