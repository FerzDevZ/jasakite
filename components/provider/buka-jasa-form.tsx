"use client"

import { useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "@/lib/toast-dynamic"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { csrfFetch } from "@/lib/csrf-fetch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, PlusCircle, CheckCircle2, ImageIcon, Upload, X } from "lucide-react"
import { formatIDR } from "@/lib/utils"

type CategoryItem = { id: string | number; name: string; slug: string }

const DESCRIPTION_MAX = 500

const EMPTY_FORM = {
  title: "",
  categoryId: "",
  price: "",
  deliveryTimeDays: "",
  description: "",
  imageUrl: "",
}

type FormState = typeof EMPTY_FORM

/**
 * Formulir pembuatan jasa + pratinjau kartu langsung.
 *
 * Pratinjau memakai latar `bg-accent` yang sama dengan `ServiceTile` — dulu
 * memakai gradien berbeda, jadi pratinjau tidak mencerminkan kartu sungguhan
 * di katalog dan provider menebak-nebak hasil akhirnya.
 */
export function BukaJasaForm({ onCreated }: { onCreated: (id: string | number) => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const [isCompressing, setIsCompressing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new window.Image()
      img.onload = () => {
        const max = 1280
        let w = img.width
        let h = img.height
        if (w > max || h > max) {
          const ratio = Math.min(max / w, max / h)
          w = Math.round(w * ratio)
          h = Math.round(h * ratio)
        }
        const canvas = document.createElement("canvas")
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          URL.revokeObjectURL(url)
          reject(new Error("Canvas tidak didukung"))
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82)
        URL.revokeObjectURL(url)
        resolve(dataUrl)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error("Gagal memuat gambar"))
      }
      img.src = url
    })
  }

  const handleFile = async (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("File harus gambar", { description: "Pilih JPG, PNG, atau WebP." })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File terlalu besar", { description: "Maksimal 10MB." })
      return
    }
    setIsCompressing(true)
    try {
      const dataUrl = await compressImage(file)
      if (dataUrl.length > 300_000) throw new Error("Gambar >300KB, pilih yang lebih kecil")
      const before = (file.size / 1024).toFixed(0)
      const after = Math.round((dataUrl.length * 0.75) / 1024)
      set("imageUrl", dataUrl)
      toast.success("Gambar siap", {
        description: `Auto-kompresi ${before}KB → ${after}KB, ${dataUrl.startsWith("data:image") ? "auto sesuaikan 1280px" : ""}`,
      })
    } catch (e) {
      toast.error("Gagal memproses gambar", { description: (e as Error).message })
    } finally {
      setIsCompressing(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const { data: categories } = useQuery<CategoryItem[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories")
      if (!res.ok) throw new Error("Gagal memuat kategori")
      return res.json()
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: FormState) => {
      const res = await csrfFetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: payload.title,
          // WAJIB string apa adanya: id kategori adalah ObjectId Mongo; Number()
          // mengubahnya menjadi NaN, dan JSON.stringify(NaN) menjadi null —
          // server menolaknya dengan "Expected string, received null". Number()
          // hanyalah warisan era SQLite saat id memang angka.
          categoryId: String(payload.categoryId),
          price: Number(payload.price),
          deliveryTimeDays: Number(payload.deliveryTimeDays),
          description: payload.description,
          imageUrl: payload.imageUrl,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(
          data?.error ?? "Gagal membuat jasa. Periksa kembali data Anda."
        )
      }
      return data as { id: string | number }
    },
    onSuccess: (data) => {
      setForm(EMPTY_FORM)
      setError("")
      queryClient.invalidateQueries({ queryKey: ["my-services"] })
      toast.success("Jasa berhasil dibuat", {
        description: "Jasa Anda sekarang tayang di katalog.",
      })
      onCreated(data.id)
    },
    onError: (err: Error) => {
      setError(err.message)
      toast.error("Gagal membuat jasa", { description: err.message })
    },
  })

  const submitting = createMutation.isPending

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary-strong" aria-hidden />
            Detail Jasa Baru
          </CardTitle>
          <CardDescription>
            Semua kolom wajib diisi agar jasa tampil informatif.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError("")
              createMutation.mutate(form)
            }}
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="title">Judul Jasa</Label>
              <Input
                id="title"
                placeholder="Contoh: Antar Paket Dokumen Pangkal Pinang"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                required
                maxLength={120}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <select
                  id="category"
                  value={form.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                  required
                  className="focus-ring flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm transition-colors"
                >
                  <option value="">Pilih kategori...</option>
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery">Estimasi Pengerjaan (hari)</Label>
                <Input
                  id="delivery"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={90}
                  placeholder="Contoh: 3"
                  value={form.deliveryTimeDays}
                  onChange={(e) => set("deliveryTimeDays", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Harga (Rp)</Label>
              <Input
                id="price"
                type="number"
                inputMode="numeric"
                min={10000}
                step={5000}
                placeholder="Contoh: 350000"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                required
              />
              {form.price && Number(form.price) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Tampil sebagai{" "}
                  <span className="font-semibold text-foreground">
                    {formatIDR(Number(form.price))}
                  </span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi Jasa</Label>
              <textarea
                id="description"
                rows={5}
                placeholder="Jelaskan apa yang pelanggan dapatkan, termasuk detail pekerjaan dan apa saja yang termasuk..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                required
                minLength={20}
                maxLength={DESCRIPTION_MAX}
                className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
              />
              <p className="text-xs text-muted-foreground">
                {form.description.length}/{DESCRIPTION_MAX} karakter — minimal 20
                karakter, deskripsi jelas meningkatkan peluang dipesan.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Gambar Cover <span className="text-muted-foreground font-normal">(opsional — URL atau upload device, auto sesuaikan)</span></Label>
              {/* Upload device — auto kompres & sesuaikan */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  const f = e.dataTransfer.files?.[0]
                  if (f) handleFile(f)
                }}
                className={`relative rounded-xl border-2 border-dashed p-4 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-primary/40"}`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                />
                <div className="flex flex-col items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isCompressing}
                    onClick={() => fileRef.current?.click()}
                    className="shadow-sm"
                  >
                    {isCompressing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
                    {isCompressing ? "Memproses & menyesuaikan..." : "Ambil dari Device"}
                  </Button>
                  <p className="text-xs text-muted-foreground">JPG/PNG/WebP max 10MB • auto kompres 1280px • rasio asli terjaga</p>
                  <p className="text-2xs text-muted-foreground/70">atau seret & lepas gambar ke sini</p>
                </div>
                {form.imageUrl && form.imageUrl.startsWith("data:image") && (
                  <div className="relative mx-auto mt-3 h-24 w-full max-w-xs overflow-hidden rounded-lg border border-border bg-card">
                    <Image src={form.imageUrl} alt="Preview upload" fill sizes="320px" className="object-cover" unoptimized />
                    <button
                      type="button"
                      onClick={() => set("imageUrl", "")}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur hover:bg-black/90"
                      aria-label="Hapus gambar"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 rounded-full bg-black/60 px-2 py-0.5 text-2xs font-medium text-white">Auto-sesuaikan</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 py-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">atau tempel URL</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="relative">
                <ImageIcon
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  id="imageUrl"
                  type="text"
                  placeholder="https://contoh.com/gambar.jpg"
                  value={form.imageUrl.startsWith("data:image") ? "" : form.imageUrl}
                  onChange={(e) => set("imageUrl", e.target.value)}
                  className="pl-9"
                  disabled={isCompressing}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {form.imageUrl.startsWith("data:image")
                  ? "Gambar dari device siap — akan otomatis menyesuaikan di kartu & galeri."
                  : "Tempel URL gambar atau kosongkan untuk ikon kategori. Upload device di atas otomatis menyesuaikan ukuran."}
              </p>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive-strong"
              >
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full shadow-glow"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Menyimpan...
                </>
              ) : (
                "Publikasikan Jasa"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>

      <div className="w-full lg:w-[340px] lg:shrink-0 self-start">
        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Pratinjau Kartu</CardTitle>
            <CardDescription>
              Beginilah jasa Anda tampil di katalog.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="relative flex h-28 items-center justify-center overflow-hidden bg-accent">
                {form.imageUrl ? (
                  <Image
                    src={form.imageUrl}
                    alt=""
                    fill
                    sizes="320px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-3xl font-extrabold text-primary/25">
                    {form.title ? form.title.charAt(0).toUpperCase() : "J"}
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="line-clamp-2 text-sm font-semibold leading-snug">
                  {form.title || "Judul jasa Anda"}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    {form.deliveryTimeDays
                      ? `${form.deliveryTimeDays} hari`
                      : "— hari"}
                  </span>
                  <span className="text-base font-extrabold text-primary-strong">
                    {form.price ? formatIDR(Number(form.price)) : "Rp 0"}
                  </span>
                </div>
              </div>
            </div>

            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              {[
                "Langsung tayang setelah dibuat",
                "Bisa disembunyikan kapan saja",
                "Tayang selama langganan aktif — Rp 10.000/30 hari",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-success"
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
