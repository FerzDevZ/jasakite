import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 animate-fade-up">
      {/* Hero skeleton */}
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48 rounded-full" />
          <Skeleton className="h-16 w-full max-w-lg" />
          <Skeleton className="h-12 w-full max-w-xl" />
          <Skeleton className="h-12 w-full max-w-xl rounded-2xl" />
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
        </div>
        <Skeleton className="aspect-square w-full rounded-3xl" />
      </div>

      {/* Categories skeleton */}
      <div className="mt-20">
        <Skeleton className="h-8 w-48" />
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>

      {/* Services skeleton */}
      <div className="mt-20">
        <Skeleton className="h-8 w-48" />
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
