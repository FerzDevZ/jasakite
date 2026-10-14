"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { StatCard } from "@/components/dashboard/stat-card"
import { PageHeader } from "@/components/layout/page-shell"
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton"
import { toast } from "@/lib/toast-dynamic"
import { csrfFetch } from "@/lib/csrf-fetch"
import {
  Users,
  UserRound,
  MapPin,
  Store,
  LogIn,
  Loader2,
  SearchX,
} from "lucide-react"

type AdminUser = {
  id: string | number
  name: string | null
  email: string
  role: "CUSTOMER" | "PROVIDER" | "ADMIN"
  location: string | null
  phone: string | null
  avatarUrl: string | null
  createdAt: string
  _count: { services: number; ordersOrderCustomer: number }
}

const ROLE_META: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  ADMIN: { label: "Admin", variant: "destructive" },
  PROVIDER: { label: "Penyedia Jasa", variant: "default" },
  CUSTOMER: { label: "Customer", variant: "outline" },
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [busyId, setBusyId] = useState<string | number | null>(null)

  useEffect(() => {
    if (status === "loading") return
    if (!session) router.push("/login")
    else if (session.user.role !== "ADMIN") router.push("/dashboard")
  }, [session, status, router])

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users")
      if (!res.ok) throw new Error("Gagal memuat pengguna")
      return res.json()
    },
    enabled: session?.user?.role === "ADMIN",
  })

  if (status === "loading" || !session || session.user.role !== "ADMIN") {
    return <DashboardSkeleton stats={3} />
  }

  const impersonate = async (user: AdminUser) => {
    setBusyId(user.id)
    const res = await csrfFetch(`/api/admin/users/${user.id}/impersonate`, {
      method: "POST",
    })
    if (res.ok) {
      // Muat ulang penuh agar seluruh session baru diterapkan
      window.location.href = "/dashboard"
    } else {
      // alert() memblokir seluruh tab dan tampil di luar sistem desain;
      // toast dipakai konsisten dengan aksi lain di aplikasi.
      const data = await res.json().catch(() => null)
      toast.error("Gagal masuk sebagai user", {
        description: data?.error ?? "Coba lagi beberapa saat lagi.",
      })
      setBusyId(null)
    }
  }

  const filtered = (users ?? []).filter((u) => {
    const q = search.toLowerCase()
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.location?.toLowerCase().includes(q)
    )
  })

  const stats = {
    total: users?.length ?? 0,
    providers: users?.filter((u) => u.role === "PROVIDER").length ?? 0,
    customers: users?.filter((u) => u.role === "CUSTOMER").length ?? 0,
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Pengguna & Akun"
        description="Kelola akun, atau masuk sebagai user tertentu untuk melihat pengalaman mereka."
        actions={
          <Input
            type="search"
            placeholder="Cari nama, email, atau kota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-72"
            aria-label="Cari pengguna"
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Akun"
          value={stats.total}
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="Penyedia Jasa"
          value={stats.providers}
          icon={Store}
          tone="info"
        />
        <StatCard
          label="Customer"
          value={stats.customers}
          icon={UserRound}
          tone="warning"
        />
      </div>

      {/* Tabel user */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daftar Akun ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={search ? "Tidak ada akun yang cocok" : "Belum ada pengguna"}
              description={
                search
                  ? "Coba kata kunci lain — pencarian mencakup nama, email, dan kota."
                  : "Akun baru akan muncul di sini begitu ada yang mendaftar."
              }
              action={
                search ? (
                  <Button variant="outline" onClick={() => setSearch("")}>
                    Hapus Pencarian
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Daftar akun pengguna JASAKITE
                </caption>
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th scope="col" className="p-3 font-medium">User</th>
                    <th scope="col" className="p-3 font-medium">Role</th>
                    <th scope="col" className="p-3 font-medium">Lokasi</th>
                    <th scope="col" className="p-3 font-medium">Jasa</th>
                    <th scope="col" className="p-3 font-medium">Pesanan</th>
                    <th scope="col" className="p-3 font-medium">Bergabung</th>
                    <th scope="col" className="p-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => {
                    const meta = ROLE_META[user.role] ?? ROLE_META.CUSTOMER
                    const isSelf = user.id === Number(session.user.id)
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-border last:border-0 hover:bg-accent/50"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {user.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={user.avatarUrl} alt={user.name ?? "User"} className="h-9 w-9 shrink-0 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary-strong">
                                {(user.name ?? "U").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {user.name ?? "Tanpa nama"}
                                {isSelf && (
                                  <span className="ml-1.5 text-xs text-primary-strong">
                                    (Anda)
                                  </span>
                                )}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant={meta.variant}>{meta.label}</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {user.location ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {user.location}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3 text-center tabular-nums">
                          {user._count.services}
                        </td>
                        <td className="p-3 text-center tabular-nums">
                          {user._count.ordersOrderCustomer}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="p-3">
                          {user.role !== "ADMIN" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === user.id}
                              onClick={() => impersonate(user)}
                              aria-label={`Masuk sebagai ${user.name ?? user.email}`}
                            >
                              {busyId === user.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <LogIn />
                              )}
                              Masuk sebagai
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
