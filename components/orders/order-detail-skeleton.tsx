import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PageShell } from "@/components/layout/page-shell"

/**
 * Skeleton detail pesanan. Bentuknya sengaja meniru layout akhir (header,
 * timeline, tiga kartu) — spinner tidak memberi petunjuk apa pun sehingga
 * halaman terasa lebih lambat dari kenyataannya.
 */
export function OrderDetailSkeleton() {
  return (
    <PageShell width="prose" className="py-8">
      <Skeleton className="mb-6 h-5 w-40" />

      <div className="mb-8 space-y-2">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-5 w-40" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
