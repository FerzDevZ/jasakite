import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"

export default function Loading() {
  return <DashboardSkeleton stats={5} panels={2} />
}
