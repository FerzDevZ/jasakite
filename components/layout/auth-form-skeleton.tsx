import { Skeleton } from "@/components/ui/skeleton"

/**
 * Skeleton kartu form auth. Dipakai oleh loading.tsx segmen (auth) dan sebagai
 * fallback Suspense di halaman login yang membaca searchParams.
 */
export function AuthFormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6">
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-7 w-56" />
        <Skeleton className="mx-auto h-4 w-64" />
      </div>
      <div className="mt-6 space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </div>
  )
}
