"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import { toast } from "@/lib/toast-dynamic"
import { useMessageStream } from "@/hooks/use-message-stream"
import { formatIDR } from "@/lib/utils"

/**
 * Pengumuman realtime keputusan dompet — top-up atau penarikan yang baru
 * diputus admin muncul sebagai toast di halaman mana pun, dan cache
 * ["wallet"] di-invalidate sehingga kartu saldo serta riwayat memperbarui
 * diri sendiri tanpa refresh halaman.
 *
 * Penerima acara adalah PEMILIK pengajuan, bukan admin: admin yang memutus
 * melihat hasilnya langsung di layar dan antreannya sendiri, jadi event ini
 * sengaja diabaikan untuk mereka.
 */
export function WalletDecisionListener() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const { subscribe } = useMessageStream(Boolean(session?.user))

  React.useEffect(() => {
    if (!session?.user) return
    return subscribe((event) => {
      if (event.type !== "walletDecision") return

      const subject =
        event.txType === "TOPUP"
          ? `Isi saldo${event.topupCode ? ` ${event.topupCode}` : ""}`
          : "Tarik saldo"
      if (event.decision === "VERIFIED") {
        toast.success(`${subject} disetujui`, {
          description: event.summary || `Nominal ${formatIDR(event.amount)}.`,
        })
      } else {
        toast.error(`${subject} ditolak`, {
          description: event.summary || `Nominal ${formatIDR(event.amount)}.`,
        })
      }
      void queryClient.invalidateQueries({ queryKey: ["wallet"] })
    })
  }, [session, subscribe, queryClient])

  return null
}
