import prisma from "@/lib/prisma"
import { prismaId } from "@/lib/ids"

/**
 * Satu jalur untuk menulis notifikasi.
 *
 * Sebelumnya lonceng navbar menurunkan daftar "notifikasi" dari kueri pesanan
 * setiap kali dipanggil. Akibatnya ada dua cacat yang tidak bisa diperbaiki di
 * sisi tampilan:
 *   1. tidak ada status dibaca — badge selalu kembali setelah polling;
 *   2. peristiwa yang bukan pesanan (pesan baru, voucher) tidak pernah bisa
 *      muncul.
 *
 * Semua penulisan notifikasi melewati fungsi ini supaya formatnya konsisten dan
 * kegagalan notifikasi TIDAK pernah menggagalkan operasi utamanya: pengguna
 * boleh kehilangan satu notifikasi, tetapi pesanan yang sudah dibuat tidak
 * boleh ikut batal hanya karena penulisan notifikasi gagal.
 */
export type NotificationType = "ORDER" | "MESSAGE" | "PROMO" | "SYSTEM"

export async function notify(input: {
  userId: string
  type: NotificationType
  title: string
  body?: string | null
  href?: string | null
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: prismaId(input.userId),
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        href: input.href ?? null,
      },
    })
  } catch (error) {
    console.error("[notify] gagal menulis notifikasi:", error)
  }
}

/** Notifikasi ke banyak pengguna sekaligus (mis. pemberitahuan promo). */
export async function notifyMany(
  userIds: string[],
  input: Omit<Parameters<typeof notify>[0], "userId">
): Promise<void> {
  await Promise.all(userIds.map((userId) => notify({ ...input, userId })))
}
