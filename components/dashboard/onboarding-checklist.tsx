"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  Circle,
  Store,
  Package,
  Star,
  MessageSquare,
  ChevronRight,
  X,
} from "lucide-react"

type OnboardingStep = {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  completed: boolean
}

/**
 * Onboarding checklist untuk pengguna baru.
 * Menampilkan progres langkah-langkah yang perlu diselesaikan.
 */
export function OnboardingChecklist({
  steps,
  onDismiss,
  className,
}: {
  steps: OnboardingStep[]
  onDismiss?: () => void
  className?: string
}) {
  const completedCount = steps.filter((s) => s.completed).length
  const totalCount = steps.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  // Jangan tampilkan jika semua sudah selesai
  if (completedCount === totalCount) return null

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="font-semibold">Langkah Awal Anda</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Selesaikan {completedCount} dari {totalCount} langkah untuk memulai
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="focus-ring rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Tutup checklist"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-smooth"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${completedCount} dari ${totalCount} langkah selesai`}
        />
      </div>

      <div className="divide-y divide-border">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <Link
              key={step.id}
              href={step.completed ? "#" : step.href}
              className={cn(
                "group flex items-center gap-4 px-5 py-4 transition-colors",
                step.completed
                  ? "cursor-default opacity-60"
                  : "hover:bg-accent/50"
              )}
              aria-disabled={step.completed}
              tabIndex={step.completed ? -1 : 0}
            >
              <div className="relative">
                {step.completed ? (
                  <CheckCircle2
                    className="h-6 w-6 text-success"
                    aria-hidden
                  />
                ) : (
                  <Circle
                    className="h-6 w-6 text-muted-foreground/40"
                    aria-hidden
                  />
                )}
                {!step.completed && (
                  <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-2xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      step.completed
                        ? "text-success"
                        : "text-muted-foreground"
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "font-medium",
                      step.completed && "line-through"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {step.description}
                </p>
              </div>

              {!step.completed && (
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-primary-strong"
                  aria-hidden
                />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Customer onboarding steps
 */
export function getCustomerSteps(hasOrders: boolean): OnboardingStep[] {
  return [
    {
      id: "browse",
      label: "Jelajahi Jasa",
      description: "Cari jasa yang Anda butuhkan",
      icon: Store,
      href: "/services",
      completed: false, // Always show as actionable
    },
    {
      id: "order",
      label: "Buat Pesanan Pertama",
      description: "Pesan jasa dan koordinasi dengan provider",
      icon: Package,
      href: "/services",
      completed: hasOrders,
    },
    {
      id: "review",
      label: "Beri Ulasan",
      description: "Bantu pelanggan lain dengan pengalaman Anda",
      icon: Star,
      href: "/dashboard/customer",
      completed: false,
    },
    {
      id: "message",
      label: "Kirim Pesan",
      description: "Koordinasi jadwal dengan provider",
      icon: MessageSquare,
      href: "/dashboard/customer",
      completed: false,
    },
  ]
}

/**
 * Provider onboarding steps
 */
export function getProviderSteps(
  serviceCount: number,
  orderCount: number,
  hasReviews: boolean
): OnboardingStep[] {
  return [
    {
      id: "service",
      label: "Buka Jasa Pertama",
      description: "Buat layanan pertama Anda di platform",
      icon: Store,
      href: "/dashboard/provider/buka-jasa",
      completed: serviceCount > 0,
    },
    {
      id: "order",
      label: "Terima Pesanan Pertama",
      description: "Konfirmasi pesanan dari pelanggan",
      icon: Package,
      href: "/dashboard/provider",
      completed: orderCount > 0,
    },
    {
      id: "complete",
      label: "Selesaikan Pesanan",
      description: "Tandai pesanan sebagai selesai",
      icon: CheckCircle2,
      href: "/dashboard/provider",
      completed: orderCount > 0, // Simplified
    },
    {
      id: "review",
      label: "Dapatkan Ulasan",
      description: "Bangun reputasi dari ulasan pelanggan",
      icon: Star,
      href: "/dashboard/provider",
      completed: hasReviews,
    },
  ]
}
