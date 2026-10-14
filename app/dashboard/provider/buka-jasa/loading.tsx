import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export default function Loading() {
  return <DashboardSkeleton stats={2} panels={1} />
}
