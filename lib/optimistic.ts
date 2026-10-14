/**
 * Pembantu update optimistik react-query — logika murni, tanpa react-query,
 * sehingga bisa diuji unit tanpa provider atau mock jaringan.
 *
 * Kontrak yang dipakai semua mutasi optimistik (sama dengan OrderKanban):
 * onMutate → cancelQueries → setQueryData optimistik → simpan `previous`
 * → onError kembalikan `previous` → onSettled invalidate agar server
 * selalu jadi sumber kebenaran akhir.
 *
 * `unknown[]` dipakai karena parameter konteks useMutation mengetik `context`
 * sebagai `TContext` generik; memaksa tipe spesifik justru memaksa cast liar
 * di setiap pemanggil. Pemanggil yang tipenya benar (array of X) tetap aman
 * karena fungsi ini murni: tidak menyimpan state, tidak melakukan I/O.
 */

/**
 * Kembalikan snapshot sebelumnya, atau undefined bila memang tidak ada
 * (query belum pernah dimuat). Dilempar dari onMutate untuk membatalkan
 * mutasi sebelum data tersedia — rollback kosong lebih jujur daripada
 * menulis state yang tidak pernah dibaca.
 */
export function rollback(previous: unknown[]): unknown[] | undefined {
  return previous
}

/**
 * Tandai satu elemen sebagai diproses (pending) berdasarkan pembanding id.
 * Elemen yang cocok diganti `patch`-nya, sisanya utuh — tanpa mutate array
 * lama (react-query mengharapkan data baru, bukan referensi yang sama).
 */
export function markPending<T>(
  items: T[],
  matchId: (item: T) => boolean,
  patch: Partial<T>
): T[] {
  return items.map((item) => (matchId(item) ? { ...item, ...patch } : item))
}

/**
 * Buang elemen dengan id yang cocok — untuk hapus optimistik (wishlist,
 * baris keranjang). Id dibandingkan lewat `matchId` supaya bekerja untuk
 * number, string, maupun ObjectId Mongo tanpa konversi.
 */
export function dropItem<T>(items: T[], matchId: (item: T) => boolean): T[] {
  return items.filter((item) => !matchId(item))
}

type PatchableLine = {
  id: string
  qty: number
  note: string | null
  unitPrice: number
}

/**
 * Terapkan patch (qty/note) ke satu baris keranjang secara murni.
 * qty di-clamp dengan aturan yang sama seperti server (`clampQty`), sehingga
 * tampilan optimistik tidak pernah menjanjikan angka yang akan ditolak.
 */
export function patchCartLine<T extends PatchableLine>(
  items: T[],
  id: string,
  patch: { qty?: number; note?: string | null },
  clamp: (qty: number) => number
): T[] {
  return items.map((line) => {
    if (line.id !== id) return line
    const next: T = { ...line }
    if (patch.qty !== undefined) {
      next.qty = clamp(patch.qty)
    }
    if (patch.note !== undefined) {
      next.note = patch.note
    }
    return next
  })
}

/**
 * Flag baca satu notifikasi — flip optimistik `read: true`.
 * Fungsi terpisah dari markPending karena notifikasi memakai `id: string`
 * dan pola ini berulang di dua mutasi (markOne, markAll).
 */
export function markRead<T extends { id: string; read: boolean }>(
  items: T[],
  id: string
): T[] {
  return items.map((item) => (item.id === id ? { ...item, read: true } : item))
}

/** Flag baca SEMUA notifikasi — versi all-rows dari markRead. */
export function markAllRead<T extends { read: boolean }>(items: T[]): T[] {
  return items.map((item) => ({ ...item, read: true }))
}
