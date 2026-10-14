import { Skeleton } from "@/components/ui/skeleton"
import { PageShell } from "@/components/layout/page-shell"
import { ServiceTileSkeleton } from "@/components/services/service-tile"

export default function Loading() {
  return (
    <PageShell className="py-8 animate-fade-up">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar filter hanya ada di desktop — skeleton mengikuti agar
            tidak terjadi layout shift ketika konten nyata masuk. */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <Skeleton className="h-96 rounded-2xl" />
        </aside>
        <div className="min-w-0 flex-1">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <ServiceTileSkeleton />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
