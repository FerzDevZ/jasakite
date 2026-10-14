import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export default function Loading() {
  return <DashboardSkeleton stats={4} panels={2} />
}
