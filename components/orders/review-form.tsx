"use client"

import { useState } from "react"
import { Star, Send, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

/**
 * Formulir ulasan. Bintang dirender sebagai radiogroup sungguhan agar bisa
 * dioperasikan dengan keyboard — sebelumnya hanya tombol tanpa state terpilih
 * yang terbaca screen reader.
 */
export function ReviewForm({
  busy,
  onSubmit,
  defaultOpen = false,
}: {
  busy: boolean
  onSubmit: (rating: number, comment: string) => void
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState("")

  const RATING_LABELS: Record<number, string> = {
    1: "Sangat kurang",
    2: "Kurang",
    3: "Cukup",
    4: "Puas",
    5: "Sangat puas",
  }

  if (!open) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Beri Ulasan</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setOpen(true)} className="shadow-glow">
            <Star /> Beri Rating &amp; Ulasan
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Beri Ulasan</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div
            role="radiogroup"
            aria-label="Rating 1 sampai 5 bintang"
            className="flex flex-wrap items-center gap-1"
            onMouseLeave={() => setHoverRating(0)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault()
                setRating((r) => Math.min(5, (r || 0) + 1))
              } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault()
                setRating((r) => Math.max(1, r - 1))
              }
            }}
          >
            {[1, 2, 3, 4, 5].map((star) => {
              const active = star <= (hoverRating || rating)
              return (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={star === rating}
                  tabIndex={star === rating || (rating === 0 && star === 1) ? 0 : -1}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onFocus={() => setHoverRating(star)}
                  onBlur={() => setHoverRating(0)}
                  aria-label={`${star} bintang — ${RATING_LABELS[star]}`}
                  className="focus-ring rounded-lg p-0.5 transition-all duration-fast hover:scale-125 active:scale-95"
                >
                  <Star
                    className={`h-8 w-8 transition-colors duration-fast ${
                      active ? "fill-rating text-rating" : "text-muted-foreground/40"
                    }`}
                    aria-hidden
                  />
                </button>
              )
            })}
            <span className="ml-2 min-w-28 text-sm font-semibold tabular-nums">
              {hoverRating
                ? `${hoverRating}/5 — ${RATING_LABELS[hoverRating]}`
                : rating > 0
                  ? `${rating}/5 — ${RATING_LABELS[rating]}`
                  : "Arahkan atau pilih rating"}
            </span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-comment">Komentar (opsional)</Label>
            <textarea
              id="review-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              placeholder="Bagaimana hasil kerjanya?"
              className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-2xs text-muted-foreground">
              {comment.length}/500 karakter
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              disabled={busy || rating === 0} 
              onClick={() => onSubmit(rating, comment)}
              className="transition-all duration-fast"
              aria-busy={busy}
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
                  Mengirim...
                </span>
              ) : (
                <><Send /> Kirim Ulasan</>
              )}
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Batal
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** Konfirmasi ulasan yang sudah terkirim. */
export function ReviewSubmitted({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-success/30 bg-success-soft p-4 text-sm">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden />
      <p>
        Ulasan Anda sudah terkirim (
        <span className="font-semibold">{rating}/5</span>). Terima kasih!
      </p>
    </div>
  )
}
