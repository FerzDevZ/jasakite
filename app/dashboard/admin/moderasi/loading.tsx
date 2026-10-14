import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export default function Loading() {
  return <DashboardSkeleton stats={3} panels={1} />
}
