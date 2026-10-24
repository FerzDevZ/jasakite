/**
 * Sumber tunggal data FAQ.
 *
 * Dipakai bersama oleh dua konsumen yang sebelumnya punya salinan sendiri:
 * - `app/faq/page.tsx` untuk JSON-LD FAQPage (SEO)
 * - `components/layout/faq-content.tsx` untuk rendering UI
 *
 * Salinan terpisah itu pernah membuat JSON-LD memancarkan `acceptedAnswer.text`
 * kosong untuk ke-14 pertanyaan — markup FAQPage tanpa jawaban ditolak Google
 * dan bisa memicu penurunan rich result, sementara UI tetap tampak benar.
 *
 * Data murni (tanpa ikon/JSX) agar bisa diimpor dari Server Component.
 */
export type FaqItem = { q: string; a: string }

export type FaqSection = {
  id: string
  title: string
  items: FaqItem[]
}

export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: "cara-pesan",
    title: "Cara Pesan",
    items: [
      {
        q: "Bagaimana cara memesan jasa di JASAKITE?",
        a: "Cari jasa yang Anda butuhkan melalui kolom pencarian atau jelajahi kategori. Bandingkan harga, rating, dan ulasan. Klik 'Pesan Sekarang' di halaman detail jasa, isi catatan tambahan, pilih metode pembayaran, lalu konfirmasi pesanan.",
      },
      {
        q: "Apakah saya perlu membuat akun untuk memesan?",
        a: "Ya, Anda perlu mendaftar sebagai Customer untuk memesan jasa. Pendaftaran gratis dan hanya butuh email serta password. Login dengan email dan password terdaftar.",
      },
      {
        q: "Bisakah saya membatalkan pesanan?",
        a: "Pesanan dengan status PENDING (sebelum dikonfirmasi provider) bisa dibatalkan. Setelah provider mengonfirmasi dan pesanan berstatus IN_PROGRESS, hubungi provider langsung melalui fitur chat di dashboard.",
      },
      {
        q: "Bagaimana saya tahu pesanan sudah selesai?",
        a: "Anda akan mendapat notifikasi di dashboard saat provider menandai pesanan selesai. Setelah itu, Anda bisa memberikan rating dan ulasan untuk penyedia jasa tersebut.",
      },
    ],
  },
  {
    id: "pembayaran",
    title: "Pembayaran",
    items: [
      {
        q: "Metode pembayaran apa saja yang tersedia?",
        a: "Ada dua cara membayar pesanan: QRIS (scan kode di halaman pesanan, transfer, unggah bukti, lalu diverifikasi admin) atau Saldo JASAKITE yang terpotong otomatis. Uang ditahan platform sampai pesanan selesai.",
      },
      {
        q: "Apakah pembayaran saya aman?",
        a: "Ya. Pembayaran memakai escrow: uang Anda ditahan platform dan penyedia baru dibayar setelah pekerjaan ditandai selesai. Bila pesanan dibatalkan setelah dibayar, dana kembali penuh ke saldo JASAKITE Anda.",
      },
      {
        q: "Apakah ada biaya tambahan?",
        a: "Tidak ada biaya layanan untuk pelanggan. Harga yang tertera di halaman jasa adalah harga final yang Anda bayar. Biaya langganan dan komisi platform hanya berlaku untuk penyedia jasa.",
      },
    ],
  },
  {
    id: "penyedia",
    title: "Untuk Penyedia Jasa",
    items: [
      {
        q: "Bagaimana cara menjadi penyedia jasa?",
        a: "Daftar akun dengan peran Provider (peran tidak bisa diubah sendiri setelah daftar — hubungi admin bila perlu), aktifkan langganan Rp 10.000 per 30 hari, lalu buka jasa pertama Anda lewat menu 'Buka Jasa'. Jasa langsung tayang setelah dipublikasikan.",
      },
      {
        q: "Berapa biaya untuk menjadi penyedia jasa?",
        a: "Pendaftaran gratis. Untuk menayangkan jasa berlaku langganan Rp 10.000 per 30 hari (dipotong otomatis dari saldo dompet), dan platform memotong komisi 10% dari nilai pesanan yang selesai — sisanya masuk saldo Anda.",
      },
      {
        q: "Bagaimana cara mendapat pesanan?",
        a: "Pastikan jasa Anda memiliki deskripsi jelas, harga kompetitif, dan gambar yang menarik. Profil lengkap dengan lokasi yang akurat membantu pelanggan menemukan Anda. Minta ulasan dari pelanggan untuk membangun reputasi.",
      },
    ],
  },
  {
    id: "kebijakan",
    title: "Kebijakan",
    items: [
      {
        q: "Apakah data pribadi saya aman?",
        a: "Data Anda disimpan dengan enkripsi dan tidak dibagikan ke pihak ketiga. Lihat detail di bagian Kebijakan Privasi di bawah.",
      },
      {
        q: "Bagaimana jika jasa tidak sesuai harapan?",
        a: "Hubungi penyedia jasa langsung melalui fitur chat di halaman pesanan. Jika tidak ada resolusi, laporkan pesanan ke admin melalui dashboard. Berikan ulasan jujur agar pelanggan lain punya gambaran yang tepat.",
      },
    ],
  },
  {
    id: "tentang",
    title: "Tentang JASAKITE",
    items: [
      {
        q: "Apa itu JASAKITE?",
        a: "JASAKITE adalah marketplace jasa lokal yang menghubungkan pelanggan dengan penyedia jasa profesional di sekitar mereka. Dari antar barang, belanja harian, bayar tagihan, hingga titip paket — semua dalam satu platform.",
      },
      {
        q: "Di daerah mana saja JASAKITE tersedia?",
        a: "Saat ini JASAKITE fokus melayani Provinsi Kepulauan Bangka Belitung — 7 kabupaten/kota dari Pangkal Pinang hingga Belitung Timur. Pilih lokasi di katalog untuk menemukan penyedia di daerah Anda.",
      },
    ],
  },
]
