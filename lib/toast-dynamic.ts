/**
 * Wrapper toast yang menunda pemuatan sonner (~34KB dengan dependensinya)
 * sampai toast pertama benar-benar dipanggil. Toast hanya muncul SETELAH
 * aksi pengguna (berhasil/gagal), jadi chunk-nya tidak perlu dievaluasi di
 * jendela kritis hydrate — pola yang sama dengan DeferredToaster di layout.
 *
 * Pemakaian: ganti `import { toast } from "sonner"` menjadi
 * `import { toast } from "@/lib/toast-dynamic"` — semua call site tetap sama.
 */
type SuccessArgs = Parameters<typeof import("sonner").toast.success>
type ErrorArgs = Parameters<typeof import("sonner").toast.error>

export const toast = {
  success: (...args: SuccessArgs) => import("sonner").then((m) => m.toast.success(...args)),
  error: (...args: ErrorArgs) => import("sonner").then((m) => m.toast.error(...args)),
}
