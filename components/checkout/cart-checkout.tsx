"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  PackageCheck,
  Plus,
  QrCode,
  Tag,
  Wallet,
} from "lucide-react"
import { toast } from "@/lib/toast-dynamic"
import { PageShell } from "@/components/layout/page-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PriceBlock } from "@/components/ui/price-block"
import { Sheet } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState } from "@/components/ui/empty-state"
import { Stepper } from "@/components/ui/stepper"
import { REGENCIES } from "@/lib/provinces"
import {
  useCheckoutBalance,
  SaldoBalanceNotice,
} from "@/components/checkout/saldo-balance"
import { csrfFetch } from "@/lib/csrf-fetch"
import { formatIDR } from "@/lib/utils"
import { cn } from "@/lib/utils"

type CartLine = {
  id: string
  qty: number
  note: string | null
  packageId: string | null
  packageName: string | null
  unitPrice: number
  available: boolean
  service: {
    id: string
    title: string
    slug: string
    imageUrl: string | null
    provider: { id: string; name: string | null; city: string | null }
  }
}

type Address = {
  id: string
  label: string
  recipient: string
  phone: string
  street: string
  city: string
  note: string | null
  isDefault: boolean
}

type VoucherOption = {
  code: string
  title: string
  description: string | null
  value: number
  type: "PERCENT" | "FIXED"
  minSpend: number
  eligible: boolean
  reason: string | null
  discount: number
}

type CreatedOrder = {
  id: string
  code: string | null
  totalPrice: number
  service: { title: string; provider: { name: string | null } }
}

const STEPS = [
  { key: "alamat", label: "Alamat" },
  { key: "jadwal", label: "Jadwal" },
  { key: "bayar", label: "Bayar" },
] as const

const PAYMENT_METHODS = [
  {
    value: "qris",
    label: "QRIS / Transfer platform",
    description: "Scan QRIS, unggah bukti, diverifikasi SUPER_ADMIN",
    icon: QrCode,
  },
  {
    value: "saldo",
    label: "Saldo JASAKITE",
    description: "Bayar instan dari saldo dompet",
    icon: Wallet,
  },
] as const

type PaymentMethod = (typeof PAYMENT_METHODS)[number]["value"]

const PAYMENT_DETAILS: Record<PaymentMethod, string> = {
  qris:
    "Uang ditahan platform (escrow) sampai pekerjaan selesai. Scan QRIS di halaman pesanan, unggah bukti, lalu SUPER_ADMIN memverifikasi. Penyedia baru dibayar setelah pesanan selesai.",
  saldo:
    "Total langsung dipotong dari saldo dompet dan ditahan platform. Penyedia menerima dana setelah pesanan selesai; pembatalan mengembalikan saldo penuh.",
}

const SCHEDULE_PRESETS = [
  { label: "Segera", days: 1 },
  { label: "Minggu ini", days: 3 },
  { label: "2 minggu", days: 14 },
  { label: "Bulan depan", days: 30 },
] as const

function titleCaseCity(city: string): string {
  return city
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

function isoDay(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().split("T")[0]
}

/**
 * Checkout tiga langkah untuk keranjang.
 *
 * Kenapa dipisah dari checkout satu-jasa (yang tetap satu halaman): satu jasa =
 * satu keputusan, dan menyembunyikan pilihan pembayaran di balik dua langkah
 * hanya menambah klik. Keranjang berisi beberapa penyedia sekaligus, sehingga
 * urutan "ke mana barang dikirim → kapan dikerjakan → bagaimana dibayar" perlu
 * ditunjukkan sebagai langkah yang bisa ditinjau, bukan satu formulir panjang
 * yang membuat pengguna menggulir untuk menemukan kesalahannya.
 *
 * Kontrak server yang dipegang:
 *  - harga & diskon dihitung ulang di server dari `items` (body tidak dikirim
 *    harga sama sekali);
 *  - `addressId` menang atas alamat teks;
 *  - `clearCart` menghapus keranjang SETELAH semua pesanan berhasil ditulis.
 */
export function CartCheckout() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [step, setStep] = React.useState(0)
  const [addressId, setAddressId] = React.useState<string | null>(null)
  const [addSheetOpen, setAddSheetOpen] = React.useState(false)
  const [voucherSheetOpen, setVoucherSheetOpen] = React.useState(false)
  const [voucherCode, setVoucherCode] = React.useState<string | null>(null)
  const [deadline, setDeadline] = React.useState("")
  const [notes, setNotes] = React.useState("")
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("qris")
  const [error, setError] = React.useState("")
  const [created, setCreated] = React.useState<CreatedOrder[] | null>(null)

  const cart = useQuery<{ items: CartLine[]; subtotal: number; unavailableCount: number }>({
    queryKey: ["cart"],
    queryFn: async () => {
      const res = await fetch("/api/cart", { cache: "no-store" })
      if (res.status === 401) {
        router.replace("/login")
        throw new Error("Sesi berakhir")
      }
      if (!res.ok) throw new Error("Gagal memuat keranjang")
      return res.json()
    },
  })

  const addresses = useQuery<{ addresses: Address[] }>({
    queryKey: ["addresses"],
    queryFn: async () => {
      const res = await fetch("/api/addresses", { cache: "no-store" })
      if (!res.ok) throw new Error("Gagal memuat alamat")
      return res.json()
    },
  })

  // Alamat default dipilih otomatis — pengguna yang sudah menyimpan alamat tidak
  // perlu memilih ulang setiap kali checkout.
  React.useEffect(() => {
    if (addressId || !addresses.data) return
    const preferred =
      addresses.data.addresses.find((a) => a.isDefault) ?? addresses.data.addresses[0]
    if (preferred) setAddressId(preferred.id)
  }, [addresses.data, addressId])

  const selectedAddress =
    addresses.data?.addresses.find((a) => a.id === addressId) ?? null
  const subtotal = cart.data?.subtotal ?? 0

  const vouchers = useQuery<{ vouchers: VoucherOption[] }>({
    queryKey: ["vouchers", subtotal, selectedAddress?.city ?? null],
    queryFn: async () => {
      const params = new URLSearchParams({ subtotal: String(subtotal) })
      if (selectedAddress?.city) params.set("city", selectedAddress.city)
      const res = await fetch(`/api/vouchers?${params}`, { cache: "no-store" })
      if (!res.ok) throw new Error("Gagal memuat voucher")
      return res.json()
    },
    enabled: step === 2 && subtotal > 0,
  })

  const activeVoucher =
    vouchers.data?.vouchers.find((v) => v.code === voucherCode && v.eligible) ?? null
  const discount = activeVoucher?.discount ?? 0
  const total = Math.max(0, subtotal - discount)

  // Saldo dompet — hanya diambil saat metode Saldo dipilih. Kekurangan saldo
  // mengunci tombol Bayar di step 3 SEBELUM submit, bukan sebagai toast 409
  // sesudahnya (pola lama yang memaksa pengguna menebak sendiri).
  const walletBalance = useCheckoutBalance(paymentMethod === "saldo")
  const saldoInsufficient =
    paymentMethod === "saldo" &&
    walletBalance.balance !== null &&
    walletBalance.balance < total

  const createAddress = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await csrfFetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error ?? "Gagal menyimpan alamat")
      return payload as Address
    },
    onSuccess: async (address) => {
      await queryClient.invalidateQueries({ queryKey: ["addresses"] })
      setAddressId(address.id)
      setAddSheetOpen(false)
      toast.success("Alamat disimpan", {
        description: `${address.label} siap dipakai untuk pesanan ini.`,
      })
    },
    onError: (e: Error) => toast.error("Alamat gagal disimpan", { description: e.message }),
  })

  const submit = useMutation({
    mutationFn: async () => {
      const items = (cart.data?.items ?? [])
        .filter((line) => line.available)
        .map((line) => ({
          serviceId: line.service.id,
          packageId: line.packageId,
          qty: line.qty,
          note: line.note,
        }))

      const res = await csrfFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          addressId,
          orderNotes: notes.trim() || undefined,
          deadline: deadline ? new Date(`${deadline}T09:00:00`) : undefined,
          paymentMethod,
          voucherCode: voucherCode || undefined,
          clearCart: true,
        }),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok) throw new Error(payload?.error ?? "Gagal membuat pesanan")
      return payload as { orders: CreatedOrder[] }
    },
    onSuccess: async (payload) => {
      setCreated(payload.orders)
      await queryClient.invalidateQueries({ queryKey: ["cart"] })
      await queryClient.invalidateQueries({ queryKey: ["vouchers"] })
      toast.success("Pesanan dibuat", {
        description: `${payload.orders.length} pesanan dikirim ke penyedia.`,
      })
      window.scrollTo({ top: 0, behavior: "smooth" })
    },
    onError: (e: Error) => {
      setError(e.message)
      toast.error("Gagal membuat pesanan", { description: e.message })
    },
  })

  if (cart.isLoading) return <CheckoutSkeleton />

  if (created) return <SuccessPanel orders={created} />

  if (!cart.data || cart.data.items.length === 0) {
    return (
      <PageShell width="prose" className="py-16">
        <EmptyState
          icon={PackageCheck}
          title="Keranjang kosong"
          description="Tambahkan jasa ke keranjang dulu, lalu kembali ke halaman ini untuk menyelesaikan pesanan."
          action={
            <Link href="/services">
              <Button className="shadow-glow">Cari jasa</Button>
            </Link>
          }
        />
      </PageShell>
    )
  }

  const blocked = cart.data.items.some((line) => !line.available)
  const canContinue =
    step === 0 ? Boolean(addressId) : true

  return (
    <PageShell width="prose" className="py-8 pb-40 animate-content-in">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
        <Link
          href="/keranjang"
          className="focus-ring rounded text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Ubah keranjang
        </Link>
      </div>

      <div className="mt-5">
        <Stepper
          steps={STEPS}
          current={step}
          onStepClick={(index) => {
            setError("")
            setStep(index)
          }}
          ariaLabel="Langkah checkout"
        />
      </div>

      {blocked && (
        <p
          role="status"
          className="mt-5 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive-strong"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Ada jasa yang sudah tidak tayang. Kembali ke keranjang dan hapus item
          bertanda merah.
        </p>
      )}

      <div className="mt-6">
        {step === 0 && (
          <AddressStep
            addresses={addresses.data?.addresses ?? []}
            loading={addresses.isLoading}
            selectedId={addressId}
            onSelect={setAddressId}
            onAdd={() => setAddSheetOpen(true)}
          />
        )}

        {step === 1 && (
          <ScheduleStep
            deadline={deadline}
            onDeadline={setDeadline}
            notes={notes}
            onNotes={setNotes}
          />
        )}

        {step === 2 && (
          <PaymentStep
            items={cart.data.items.filter((line) => line.available)}
            subtotal={subtotal}
            discount={discount}
            total={total}
            voucher={activeVoucher}
            onPickVoucher={() => setVoucherSheetOpen(true)}
            onClearVoucher={() => setVoucherCode(null)}
            paymentMethod={paymentMethod}
            onPaymentMethod={setPaymentMethod}
            address={selectedAddress}
            deadline={deadline}
            saldoBalance={walletBalance.balance}
            saldoLoading={walletBalance.loading}
          />
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive-strong"
        >
          {error}
        </p>
      )}

      {/* Bar aksi melekat di mobile; di desktop tombolnya duduk di kartu
          ringkasan agar tidak ada dua tombol utama dalam satu layar. */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-3 border-t border-border bg-background/90 px-4 py-3 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 md:static md:mt-6 md:rounded-2xl md:border md:bg-card md:px-5 md:py-4 md:backdrop-blur-none">
        {step > 0 ? (
          <Button
            variant="outline"
            size="lg"
            className="shrink-0"
            onClick={() => {
              setError("")
              setStep((s) => Math.max(0, s - 1))
            }}
          >
            Kembali
          </Button>
        ) : (
          <div className="hidden text-sm text-muted-foreground md:block">
            {STEPS[step].label}
          </div>
        )}

        <div className="ml-auto w-full max-w-[18rem]">
          {step < 2 ? (
            <Button
              size="lg"
              className="w-full shadow-glow"
              disabled={!canContinue || blocked}
              onClick={() => {
                setError("")
                setStep((s) => Math.min(2, s + 1))
              }}
            >
              {step === 0 ? "Lanjut ke jadwal" : "Lanjut ke pembayaran"}
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full shadow-glow"
              disabled={submit.isPending || blocked || saldoInsufficient}
              onClick={() => {
                setError("")
                submit.mutate()
              }}
            >
              {submit.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Memproses...
                </>
              ) : (
                `Buat pesanan · ${formatIDR(total)}`
              )}
            </Button>
          )}
        </div>
      </div>

      <AddAddressSheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        saving={createAddress.isPending}
        onSubmit={(values) => createAddress.mutate(values)}
      />

      <VoucherSheet
        open={voucherSheetOpen}
        onOpenChange={setVoucherSheetOpen}
        vouchers={vouchers.data?.vouchers ?? []}
        loading={vouchers.isLoading}
        selected={voucherCode}
        onSelect={(code) => {
          setVoucherCode(code)
          setVoucherSheetOpen(false)
        }}
      />
    </PageShell>
  )
}

function AddressStep({
  addresses,
  loading,
  selectedId,
  onSelect,
  onAdd,
}: {
  addresses: Address[]
  loading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
  onAdd: () => void
}) {
  return (
    <section aria-labelledby="langkah-alamat" className="space-y-4">
      <div>
        <h2 id="langkah-alamat" className="text-lg font-bold">
          Ke mana jasa dikerjakan?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Alamat tersimpan mengisi nama penerima dan nomor telepon sekaligus,
          sehingga penyedia punya kontak yang benar sejak awal.
        </p>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Belum ada alamat tersimpan"
          description="Simpan alamat sekali, dan seterusnya checkout hanya perlu satu ketukan."
          action={
            <Button onClick={onAdd}>
              <Plus aria-hidden /> Tambah alamat
            </Button>
          }
        />
      ) : (
        <ul className="space-y-2.5">
          {addresses.map((address) => {
            const active = address.id === selectedId
            return (
              <li key={address.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <input
                    type="radio"
                    name="alamat"
                    value={address.id}
                    checked={active}
                    onChange={() => onSelect(address.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{address.label}</span>
                      {address.isDefault && (
                        <span className="rounded-md bg-success-soft px-1.5 py-0.5 text-2xs font-semibold text-success">
                          Utama
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-sm">
                      {address.recipient} · {address.phone}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {address.street}, {titleCaseCity(address.city)}
                    </span>
                    {address.note && (
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Catatan kurir: {address.note}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      {addresses.length > 0 && (
        <Button variant="outline" onClick={onAdd}>
          <Plus aria-hidden /> Alamat baru
        </Button>
      )}
    </section>
  )
}

function ScheduleStep({
  deadline,
  onDeadline,
  notes,
  onNotes,
}: {
  deadline: string
  onDeadline: (value: string) => void
  notes: string
  onNotes: (value: string) => void
}) {
  const minDate = isoDay(1)

  return (
    <section aria-labelledby="langkah-jadwal" className="space-y-5">
      <div>
        <h2 id="langkah-jadwal" className="text-lg font-bold">
          Kapan enaknya dikerjakan?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Perkiraan saja — jadwal pasti tetap bisa diubah lewat pesan dengan
          penyedia setelah pesanan dikonfirmasi.
        </p>
      </div>

      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-2">
          {SCHEDULE_PRESETS.map((preset) => {
            const value = isoDay(preset.days)
            const active = deadline === value
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={active}
                onClick={() => onDeadline(active ? "" : value)}
                className={cn(
                  "focus-ring rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary/10 text-primary-strong"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {preset.label}
              </button>
            )
          })}
        </div>

        <div className="space-y-2">
          <Label htmlFor="checkout-deadline">Tanggal yang Diinginkan</Label>
          <Input
            id="checkout-deadline"
            type="date"
            min={minDate}
            value={deadline}
            onChange={(e) => onDeadline(e.target.value)}
            className="w-full sm:w-64"
          />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            Boleh dikosongkan bila belum menentukan tanggal.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="checkout-notes">Catatan untuk semua penyedia</Label>
          <span
            className={cn(
              "text-2xs tabular-nums",
              notes.length >= 480 ? "text-destructive-strong" : "text-muted-foreground"
            )}
          >
            {notes.length}/500
          </span>
        </div>
        <textarea
          id="checkout-notes"
          rows={3}
          maxLength={500}
          value={notes}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="Contoh: gerbang butuh kode akses 4321, hubungi dulu sebelum datang"
          className="focus-ring w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground"
        />
        <p className="text-xs text-muted-foreground">
          Catatan per jasa bisa diisi dari halaman keranjang.
        </p>
      </div>
    </section>
  )
}

function PaymentStep({
  items,
  subtotal,
  discount,
  total,
  voucher,
  onPickVoucher,
  onClearVoucher,
  paymentMethod,
  onPaymentMethod,
  address,
  deadline,
  saldoBalance,
  saldoLoading,
}: {
  items: CartLine[]
  subtotal: number
  discount: number
  total: number
  voucher: VoucherOption | null
  onPickVoucher: () => void
  onClearVoucher: () => void
  paymentMethod: PaymentMethod
  onPaymentMethod: (value: PaymentMethod) => void
  address: Address | null
  deadline: string
  saldoBalance: number | null
  saldoLoading: boolean
}) {
  return (
    <section aria-labelledby="langkah-bayar" className="space-y-4">
      <div>
        <h2 id="langkah-bayar" className="text-lg font-bold">
          Pembayaran &amp; ringkasan
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Periksa sekali lagi — pesanan akan langsung dikirim ke penyedia
          setelah dibuat.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-semibold">Dikirim ke</span>
            <span className="text-muted-foreground">
              {address ? titleCaseCity(address.city) : "-"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {address
              ? `${address.recipient} · ${address.street}`
              : "Alamat belum dipilih"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Jadwal:{" "}
            {deadline
              ? new Intl.DateTimeFormat("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(new Date(`${deadline}T09:00:00`))
              : "fleksibel / menyusul"}
          </p>
        </div>

        <ul className="divide-y divide-border">
          {items.map((line) => (
            <li key={line.id} className="flex items-center gap-3 px-4 py-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-accent">
                {line.service.imageUrl ? (
                  <Image
                    src={line.service.imageUrl}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                    unoptimized={line.service.imageUrl.startsWith("data:")}
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-medium">
                  {line.service.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {line.service.provider.name ?? "Penyedia"}
                  {line.packageName ? ` · Paket ${line.packageName}` : ""} ·{" "}
                  {line.qty}x
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatIDR(line.unitPrice * line.qty)}
              </span>
            </li>
          ))}
        </ul>

        <div className="space-y-2 border-t border-border px-4 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium tabular-nums">{formatIDR(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Biaya layanan</span>
            <span className="font-semibold text-success">GRATIS</span>
          </div>
          {discount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Voucher {voucher?.code}
              </span>
              <span className="font-semibold tabular-nums text-success">
                −{formatIDR(discount)}
              </span>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="font-semibold">Total bayar</span>
            <PriceBlock amount={total} size="lg" />
          </div>
        </div>

        <div className="border-t border-border px-4 py-3">
          {voucher ? (
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 shrink-0 text-success" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm">
                <span className="font-semibold">{voucher.code}</span>
                <span className="text-muted-foreground"> — hemat {formatIDR(voucher.discount)}</span>
              </span>
              <button
                type="button"
                onClick={onClearVoucher}
                className="focus-ring rounded text-xs font-medium text-muted-foreground underline-offset-4 hover:text-destructive-strong hover:underline"
              >
                Lepas
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onPickVoucher}
              className="focus-ring flex w-full items-center gap-2 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Tag className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1 text-left">Pakai voucher / kode promo</span>
              <span className="text-xs font-semibold text-primary-strong">Pilih</span>
            </button>
          )}
        </div>
      </div>

      <fieldset className="space-y-2.5">
        <legend className="mb-1 text-sm font-semibold">
          Cara pembayaran
        </legend>
        {PAYMENT_METHODS.map((method) => {
          const active = method.value === paymentMethod
          return (
            <label
              key={method.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition-colors",
                active
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <input
                type="radio"
                name="metode-bayar"
                value={method.value}
                checked={active}
                onChange={() => onPaymentMethod(method.value)}
                className="h-4 w-4 shrink-0 accent-primary"
              />
              <method.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{method.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {method.description}
                </span>
              </span>
            </label>
          )
        })}
        <p className="rounded-xl bg-muted/60 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
          {PAYMENT_DETAILS[paymentMethod]}
        </p>
        {paymentMethod === "saldo" && (
          <SaldoBalanceNotice
            total={total}
            balance={saldoBalance}
            loading={saldoLoading}
          />
        )}
      </fieldset>
    </section>
  )
}

function AddAddressSheet({
  open,
  onOpenChange,
  saving,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  saving: boolean
  onSubmit: (values: Record<string, unknown>) => void
}) {
  const [values, setValues] = React.useState({
    label: "Rumah",
    recipient: "",
    phone: "",
    street: "",
    city: REGENCIES[0].name,
    note: "",
  })

  const set = (key: keyof typeof values, value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }))

  const valid =
    values.recipient.trim().length >= 2 &&
    values.phone.trim().length >= 8 &&
    values.street.trim().length >= 5

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Alamat baru"
      description="Hanya dipakai untuk pengiriman jasa — tidak dibagikan ke pihak lain."
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          onSubmit({
            label: values.label.trim() || "Rumah",
            recipient: values.recipient.trim(),
            phone: values.phone.trim(),
            street: values.street.trim(),
            city: values.city,
            note: values.note.trim() || undefined,
          })
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="addr-label">Label alamat</Label>
          <Input
            id="addr-label"
            value={values.label}
            maxLength={30}
            onChange={(e) => set("label", e.target.value)}
            placeholder="Rumah / Kantor / Toko"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="addr-recipient">Nama penerima</Label>
          <Input
            id="addr-recipient"
            value={values.recipient}
            maxLength={80}
            onChange={(e) => set("recipient", e.target.value)}
            placeholder="Nama lengkap"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="addr-phone">Nomor telepon</Label>
          <Input
            id="addr-phone"
            type="tel"
            inputMode="tel"
            value={values.phone}
            maxLength={20}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="0812xxxxxxx"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="addr-street">Alamat lengkap</Label>
          <textarea
            id="addr-street"
            rows={3}
            required
            maxLength={300}
            value={values.street}
            onChange={(e) => set("street", e.target.value)}
            placeholder="Jalan, nomor rumah, RT/RW, kelurahan, kecamatan"
            className="focus-ring w-full resize-none rounded-xl border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="addr-city">Kabupaten/Kota</Label>
          <select
            id="addr-city"
            value={values.city}
            onChange={(e) => set("city", e.target.value)}
            className="focus-ring h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          >
            {REGENCIES.map((regency) => (
              <option key={regency.name} value={regency.name}>
                {regency.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            JASAKITE melayani seluruh Kepulauan Bangka Belitung.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="addr-note">Patokan (opsional)</Label>
          <Input
            id="addr-note"
            value={values.note}
            maxLength={200}
            onChange={(e) => set("note", e.target.value)}
            placeholder="Contoh: rumah pagar hijau sebelah warung"
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={saving || !valid}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Menyimpan...
            </>
          ) : (
            "Simpan alamat"
          )}
        </Button>
      </form>
    </Sheet>
  )
}

function VoucherSheet({
  open,
  onOpenChange,
  vouchers,
  loading,
  selected,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  vouchers: VoucherOption[]
  loading: boolean
  selected: string | null
  onSelect: (code: string) => void
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Voucher"
      description="Voucher dihitung ulang di server saat pesanan dibuat."
      size="tall"
    >
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : vouchers.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Belum ada voucher"
          description="Saat ini tidak ada promo yang berlaku untuk wilayahmu."
          animated={false}
        />
      ) : (
        <ul className="space-y-3">
          {vouchers.map((voucher) => {
            const active = voucher.code === selected
            return (
              <li key={voucher.code}>
                <button
                  type="button"
                  disabled={!voucher.eligible}
                  onClick={() => onSelect(voucher.code)}
                  className={cn(
                    "focus-ring flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                    active && "border-success bg-success-soft",
                    !active && voucher.eligible && "border-border bg-card hover:border-primary/40",
                    !voucher.eligible && "border-dashed border-border bg-muted/40 opacity-70"
                  )}
                >
                  <Tag
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      voucher.eligible ? "text-success" : "text-muted-foreground"
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{voucher.title}</span>
                      <span className="rounded-md bg-foreground/5 px-1.5 py-0.5 font-mono text-2xs font-semibold">
                        {voucher.code}
                      </span>
                    </span>
                    {voucher.description && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {voucher.description}
                      </span>
                    )}
                    <span
                      className={cn(
                        "mt-1 block text-xs font-medium",
                        voucher.eligible ? "text-success" : "text-muted-foreground"
                      )}
                    >
                      {voucher.eligible
                        ? `Hemat ${formatIDR(voucher.discount)}`
                        : voucher.reason}
                    </span>
                  </span>
                  {active && (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Sheet>
  )
}

function SuccessPanel({ orders }: { orders: CreatedOrder[] }) {
  const grouped = orders.length > 1

  return (
    <PageShell width="prose" className="py-12 animate-content-in">
      <div className="rounded-3xl border border-border bg-card p-6 text-center sm:p-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft">
          <CheckCircle2 className="h-9 w-9 text-success" aria-hidden />
        </div>
        <h1 className="mt-4 text-2xl font-bold">
          {grouped ? `${orders.length} pesanan dibuat` : "Pesanan dibuat"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {grouped
            ? "Selesaikan pembayaran setiap pesanan lewat halaman masing-masing. Penyedia mulai bekerja setelah pembayaran diverifikasi."
            : "Selesaikan pembayaran lewat halaman pesanan. Penyedia baru mulai bekerja setelah pembayaran diverifikasi SUPER_ADMIN."}
        </p>

        <ul className="mt-6 space-y-2.5 text-left">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="focus-ring flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 transition-colors hover:border-primary/40"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {order.code ? `#${order.code}` : "Pesanan"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {order.service.title} · {order.service.provider.name ?? "Penyedia"}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatIDR(order.totalPrice)}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/orders">
            <Button className="w-full shadow-glow sm:w-auto">Lihat semua pesanan</Button>
          </Link>
          <Link href="/services">
            <Button variant="outline" className="w-full sm:w-auto">
              Cari jasa lagi
            </Button>
          </Link>
        </div>
      </div>
    </PageShell>
  )
}

function CheckoutSkeleton() {
  return (
    <PageShell width="prose" className="py-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-5 h-8 w-72" />
      <div className="mt-6 space-y-3">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    </PageShell>
  )
}
