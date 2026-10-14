import { CheckCircle2, XCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ORDER_STEPS, statusShortLabel, type OrderStatus } from "@/lib/order-status"

const STEP_LABEL: Record<string, string> = {
  PENDING: "Dipesan",
  IN_PROGRESS: "Dikerjakan",
  COMPLETED: "Selesai",
}

const STEP_HINT: Record<string, string> = {
  PENDING: "Menunggu penyedia mengonfirmasi",
  IN_PROGRESS: "Penyedia sedang mengerjakan",
  COMPLETED: "Pekerjaan selesai",
}

function formatStamp(value: string | null | undefined): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

/**
 * Timeline progres pesanan. CANCELLED bukan langkah lanjutan, jadi saat
 * dibatalkan seluruh jalur ditampilkan redup dengan catatan terpisah —
 * bukan sebagai step keempat yang menyesatkan.
 *
 * Cap waktu per tahap ditampilkan karena "sedang dikerjakan" tanpa "sejak
 * kapan" adalah pertanyaan pertama yang muncul saat pesanan terasa lama, dan
 * jawabannya sudah tersimpan di database (`acceptedAt`, `completedAt`).
 * `updatedAt` tidak dipakai: kolom itu berubah pada setiap mutasi sehingga
 * akan menampilkan waktu edit terakhir, bukan waktu tahapnya dimulai.
 */
export function OrderTimeline({
  status,
  createdAt,
  acceptedAt,
  completedAt,
  cancelledAt,
}: {
  status: OrderStatus
  createdAt?: string | null
  acceptedAt?: string | null
  completedAt?: string | null
  cancelledAt?: string | null
}) {
  const cancelled = status === "CANCELLED"
  const currentStep = ORDER_STEPS.indexOf(status)

  const stamps: Record<string, string | null> = {
    PENDING: formatStamp(createdAt),
    IN_PROGRESS: formatStamp(acceptedAt),
    COMPLETED: formatStamp(completedAt),
  }

  return (
    <Card>
      <CardContent className="p-6">
        <ol
          className="flex items-start"
          aria-label={`Progres pesanan: ${statusShortLabel(status)}`}
        >
          {ORDER_STEPS.map((step, i) => {
            const done = !cancelled && (currentStep > i || status === step)
            const reached = !cancelled && currentStep >= i
            const stamp = reached ? stamps[step] : null
            return (
              <li key={step} className="flex flex-1 items-start last:flex-none">
                <div className="flex flex-col items-center text-center">
                  <div
                    aria-current={status === step ? "step" : undefined}
                    className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : status === step && !cancelled
                          ? "border-primary bg-primary/10 text-primary-strong"
                          : "border-border bg-card text-muted-foreground"
                    } ${status === step && !cancelled ? "ring-2 ring-primary/20" : ""}`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                    ) : (
                      <span className="text-xs font-bold">{i + 1}</span>
                    )}
                  </div>
                  <span
                    className={`mt-2 text-2xs font-medium ${
                      done ? "text-foreground" : "text-muted-foreground"
                    } ${status === step ? "text-primary-strong" : ""}`}
                  >
                    {STEP_LABEL[step]}
                  </span>
                  <span className="mt-0.5 max-w-[7rem] text-[10px] leading-tight text-muted-foreground">
                    {stamp ?? (status === step && !cancelled ? STEP_HINT[step] : "")}
                  </span>
                </div>
                {i < ORDER_STEPS.length - 1 && (
                  <div
                    aria-hidden
                    className={`mx-2 mt-4 h-0.5 flex-1 rounded-full transition-colors duration-500 ${
                      !cancelled && currentStep > i ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </li>
            )
          })}
        </ol>

        {cancelled && (
          <p className="mt-4 flex items-center gap-2 text-sm text-destructive-strong">
            <XCircle className="h-4 w-4 shrink-0" aria-hidden /> Pesanan ini
            dibatalkan
            {formatStamp(cancelledAt) ? ` pada ${formatStamp(cancelledAt)}` : ""}.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
