// Backfill kolom pelacakan pesanan untuk data yang SUDAH ada.
//
// Jalankan sekali setelah `npx prisma db push` menambahkan kolom baru:
//   node prisma/backfill-order-tracking.js
//
// Yang diisi dan alasannya:
//   1. `code`      — nomor pesanan manusiawi. Tanpa ini, semua pesanan lama
//                    tampil tanpa nomor sama sekali di UI yang baru.
//   2. `acceptedAt`— timeline membaca cap waktu nyata, bukan menebak dari
//                    `updatedAt` (kolom itu berubah setiap mutasi sehingga
//                    riwayatnya bisa berbohong).
//   3. `cancelledAt` — sama, untuk jalur pembatalan.
//   4. `subtotal`  — pesanan lama belum punya rincian harga; nilai terbaik yang
//                    tersedia adalah `totalPrice` (belum ada diskon saat itu).
//   5. `unitPrice`/`qty` — rincian "Rp X × N" di halaman pesanan. Pesanan lama
//                    dibuat dari satu jasa tanpa kuantitas, jadi unitPrice =
//                    totalPrice dan qty = 1 adalah rekonstruksi yang jujur;
//                    membiarkannya 0 membuat halaman menampilkan "Rp0 × 1".
//
// Skrip ini idempoten: baris yang sudah terisi tidak disentuh.
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

const CODE_ALPHABET = "2346789ABCDEFGHJKMNPQRTUVWXYZ"

function demoOrderCode(n) {
  let out = ""
  let value = n
  for (let i = 0; i < 5; i++) {
    out = CODE_ALPHABET[value % CODE_ALPHABET.length] + out
    value = Math.floor(value / CODE_ALPHABET.length)
  }
  return `JK-${out}`
}

async function main() {
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      code: true,
      status: true,
      subtotal: true,
      totalPrice: true,
      unitPrice: true,
      qty: true,
      createdAt: true,
      updatedAt: true,
      completedAt: true,
    },
    orderBy: { createdAt: "asc" },
  })

  // Kode yang sudah dipakai tidak boleh ditabrak oleh kode baru.
  const used = new Set(orders.map((o) => o.code).filter(Boolean))
  let codeSeq = 0
  const nextCode = () => {
    let candidate
    do {
      candidate = demoOrderCode(++codeSeq)
    } while (used.has(candidate))
    used.add(candidate)
    return candidate
  }

  let touched = 0
  for (const order of orders) {
    const data = {}
    if (!order.code) data.code = nextCode()
    if (order.subtotal === 0 && order.totalPrice > 0) data.subtotal = order.totalPrice
    if (order.unitPrice === 0 && order.totalPrice > 0) data.unitPrice = order.totalPrice
    if (!order.qty || order.qty < 1) data.qty = 1
    if (!order.completedAt && order.status === "COMPLETED") {
      data.completedAt = order.updatedAt
    }
    if (!order.completedAt && order.status !== "PENDING" && !order.acceptedAt) {
      data.acceptedAt = order.updatedAt
    }
    if (order.status === "CANCELLED") {
      data.cancelledAt = order.updatedAt
    }
    if (Object.keys(data).length === 0) continue
    await prisma.order.update({ where: { id: order.id }, data })
    touched++
  }

  console.log(`Backfill pelacakan pesanan selesai: ${touched}/${orders.length} pesanan diperbarui.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
