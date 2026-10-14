import { Skeleton } from "@/components/ui/skeleton"
import { PageShell } from "@/components/layout/page-shell"

export default function Loading() {
  return (
    <PageShell width="prose" className="py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <Skeleton className="h-14 w-14 rounded-2xl" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-full" />
        ))}
      </div>

      <div className="mt-12 space-y-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </PageShell>
  )
}
