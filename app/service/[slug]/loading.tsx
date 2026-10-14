import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px] lg:gap-12 lg:items-start">
        <div className="min-w-0 space-y-8">
          <Skeleton className="aspect-video rounded-2xl" />
          <div className="lg:hidden space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-3/4" />
          </div>
          <Skeleton className="h-12 w-full max-w-xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <div className="hidden lg:block space-y-5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>
      <Skeleton className="mt-16 h-64 w-full max-w-7xl rounded-2xl" />
    </div>
  )
}
