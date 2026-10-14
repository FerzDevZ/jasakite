import { Skeleton } from "@/components/ui/skeleton"
import { PageShell } from "@/components/layout/page-shell"

export default function Loading() {
  return (
    <PageShell className="py-10">
      <div className="flex flex-col items-start gap-6 rounded-3xl border border-border bg-card p-6 md:flex-row md:items-center md:p-8">
        <Skeleton className="h-24 w-24 rounded-3xl" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <div className="grid w-full grid-cols-3 gap-4 md:w-auto">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl md:w-24" />
          ))}
        </div>
      </div>

      <Skeleton className="mt-10 h-8 w-48" />
      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </PageShell>
  )
}
