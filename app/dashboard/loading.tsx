import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 animate-fade-up">
      <Skeleton className="h-10 w-64" />
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-8 h-64 rounded-2xl" />
    </div>
  )
}
