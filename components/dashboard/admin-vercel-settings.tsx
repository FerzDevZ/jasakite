"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { PageHeader } from "@/components/layout/page-shell"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { isAdminRole } from "@/lib/roles"
import { cn } from "@/lib/utils"
import {
  GitBranch,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"
import type { DeploymentSummary, VercelTarget } from "@/lib/vercel-deployments"

type VercelStatus = {
  gate: {
    ignoreCommand: string | null
    buildInputPatterns: string[]
  }
  vercel: {
    configured: boolean
    missingEnvVars: string[]
    deployments: DeploymentSummary[]
    error: string | null
  }
}

const TARGET_LABEL: Record<VercelTarget, string> = {
  production: "Produksi",
  preview: "Preview",
  development: "Development",
}

const TARGET_VARIANT: Record<VercelTarget, "default" | "outline" | "muted"> = {
  production: "default",
  preview: "outline",
  development: "muted",
}

const STATE_LABEL: Record<string, string> = {
  READY: "Siap",
  ERROR: "Gagal",
  BUILDING: "Membangun",
  QUEUED: "Antre",
  INITIALIZING: "Menyiapkan",
  CANCELED: "Dibatalkan",
}

const STATE_VARIANT: Record<
  string,
  "success" | "destructive" | "info" | "warning" | "muted"
> = {
  READY: "success",
  ERROR: "destructive",
  BUILDING: "info",
  QUEUED: "info",
  INITIALIZING: "info",
  CANCELED: "muted",
}

/** Waktu relatif ringan untuk baris deployment. */
function timeAgo(epochMs: number): string {
  if (!epochMs) return "—"
  const minutes = Math.floor((Date.now() - epochMs) / 60_000)
  if (minutes < 1) return "Baru saja"
  if (minutes < 60) return `${minutes} mnt lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} hari lalu`
  return new Date(epochMs).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatDuration(durationMs: number | null): string {
  if (durationMs === null) return "—"
  const totalSeconds = Math.round(durationMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${seconds} dtk`
  return `${minutes} mnt ${seconds} dtk`
}

function shortSha(sha: string | null): string {
  if (!sha) return "—"
  return sha.slice(0, 7)
}

function DeploymentRow({ deployment }: { deployment: DeploymentSummary }) {
  const stateLabel = STATE_LABEL[deployment.state] ?? deployment.state
  const stateVariant = STATE_VARIANT[deployment.state] ?? "muted"

  return (
    <li className="flex flex-col gap-2 border-b border-border py-4 last:border-b-0 last:pb-0 first:pt-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={TARGET_VARIANT[deployment.target]}>
            {TARGET_LABEL[deployment.target]}
          </Badge>
          <Badge variant={stateVariant}>{stateLabel}</Badge>
          {deployment.commitRef ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <GitBranch className="h-3.5 w-3.5" aria-hidden />
              {deployment.commitRef}
            </span>
          ) : null}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {shortSha(deployment.commitSha)}
          </code>
        </div>
        <p className="truncate text-sm text-foreground">
          {deployment.commitMessage ?? "Tanpa pesan commit"}
        </p>
        {deployment.canceled ? (
          <p className="text-xs text-muted-foreground">
            Build dibatalkan. Status ini dipakai Vercel untuk build yang dilewati
            Ignored Build Step sekaligus pembatalan manual — log build yang
            membedakannya.
          </p>
        ) : null}
      </div>
      <div className="shrink-0 text-xs text-muted-foreground sm:text-right">
        <p>{timeAgo(deployment.createdAt)}</p>
        <p className="tabular-nums">{formatDuration(deployment.durationMs)}</p>
      </div>
    </li>
  )
}

function GateCard({ gate }: { gate: VercelStatus["gate"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary-strong" aria-hidden />
          Gerbang build
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            ignoreCommand
          </p>
          <code className="block overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs text-foreground">
            {gate.ignoreCommand ?? "tidak diset di vercel.json"}
          </code>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {gate.buildInputPatterns.length} pola memicu build
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {gate.buildInputPatterns.map((pattern) => (
              <li
                key={pattern}
                className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
              >
                {pattern}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
          <p>
            Berlaku untuk <strong className="font-semibold text-foreground">produksi dan preview</strong>{" "}
            sekaligus: Vercel menjalankan perintah yang sama untuk setiap
            deployment project ini.
          </p>
          <p>
            Bila Project Settings → Git → Ignored Build Step diisi di dashboard,
            nilai itu yang dipakai dan perintah di atas tidak lagi berlaku —
            pastikan isinya identik.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminVercelSettings() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return
    if (!session) router.push("/login")
    else if (!isAdminRole(session.user.role)) router.push("/dashboard")
  }, [session, status, router])

  const isAdmin = isAdminRole(session?.user?.role)

  const { data, isLoading, isError, isFetching, refetch } = useQuery<VercelStatus>({
    queryKey: ["admin-vercel-status"],
    queryFn: async () => {
      const response = await fetch("/api/admin/vercel", { cache: "no-store" })
      if (!response.ok) throw new Error("Gagal memuat status build")
      return response.json()
    },
    enabled: isAdmin,
  })

  if (status === "loading" || !session || !isAdmin) {
    return <DashboardSkeleton stats={0} panels={2} />
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Build & Deploy"
        description="Aturan kapan Vercel membangun ulang project ini, beserta deployment produksi dan preview terakhir."
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => refetch()}
          >
            <RefreshCw
              className={cn("h-4 w-4", isFetching && "animate-spin")}
              aria-hidden
            />
            Muat ulang
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deployment terakhir</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isError ? (
              <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Status build tidak bisa dimuat. Coba muat ulang; bila tetap
                gagal, periksa log server.
              </p>
            ) : isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : !data?.vercel.configured ? (
              <EmptyState
                icon={KeyRound}
                title="Belum terhubung ke Vercel API"
                description={`Setel ${data?.vercel.missingEnvVars.join(" dan ") ?? "VERCEL_TOKEN dan VERCEL_PROJECT_ID"} pada environment variable (Production + Preview, sensitive). Token dibuat di vercel.com/account/tokens; project ID terlihat di Project Settings.`}
              />
            ) : data.vercel.error ? (
              <p className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
                {data.vercel.error}
              </p>
            ) : data.vercel.deployments.length === 0 ? (
              <EmptyState
                icon={TriangleAlert}
                title="Belum ada deployment"
                description="Vercel belum mengembalikan deployment apa pun untuk project ini."
              />
            ) : (
              <ul className="text-sm">
                {data.vercel.deployments.map((deployment) => (
                  <DeploymentRow key={deployment.id} deployment={deployment} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {data ? <GateCard gate={data.gate} /> : <Skeleton className="h-72 w-full rounded-2xl" />}
      </div>
    </div>
  )
}
