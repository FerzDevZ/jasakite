"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertTriangle } from "lucide-react"

/**
 * Error panel konsisten dengan retry button.
 * Menggantikan error handling ad-hoc di berbagai halaman.
 */
export function ErrorPanel({
  title = "Terjadi kesalahan",
  message = "Silakan coba lagi atau hubungi dukungan jika masalah berlanjut.",
  error,
  onRetry,
  className,
}: {
  title?: string
  message?: string
  error?: Error | null
  onRetry?: () => void
  className?: string
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-14 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive-strong">
        <AlertTriangle className="h-6 w-6" aria-hidden />
      </div>
      <p className="font-semibold">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{message}</p>
      {error?.message && (
        <p className="mt-2 max-w-md font-mono text-xs text-muted-foreground/60">
          {error.message}
        </p>
      )}
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="mt-5"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Coba Lagi
        </Button>
      )}
    </div>
  )
}

/**
 * Inline error for forms and small sections.
 */
export function InlineError({
  message,
  id,
  className,
}: {
  message: string
  id?: string
  className?: string
}) {
  if (!message) return null
  return (
    <p
      id={id}
      role="alert"
      className={cn("text-xs text-destructive-strong", className)}
    >
      {message}
    </p>
  )
}
