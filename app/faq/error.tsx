"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

export default function FAQError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[FAQ Error]", error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <Card className="max-w-md text-center">
        <CardContent className="space-y-4 p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold">Gagal memuat FAQ</h2>
          <p className="text-sm text-muted-foreground">
            Terjadi kesalahan saat memuat halaman FAQ. Silakan coba lagi.
          </p>
          <Button onClick={reset} variant="outline">
            Coba Lagi
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
