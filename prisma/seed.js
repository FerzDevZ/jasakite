// Seed data realistis untuk pengembangan
// Jalankan: node prisma/seed.js
const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1_000)
}

// Nomor pesanan demo yang deterministik: cukup unik untuk seluruh baris seed
// tanpa perlu memeriksa database, dan berbentuk sama dengan kode asli dari
// lib/order-code.ts ("JK-xxxxx").
const CODE_ALPHABET = "2346789ABCDEFGHJKMNPQRTUVWXYZ"
let demoOrderSeq = 0
function demoOrderCode(n) {
  let out = ""
  let value = n
  for (let i = 0; i < 5; i++) {
    out = CODE_ALPHABET[value % CODE_ALPHABET.length] + out
    value = Math.floor(value / CODE_ALPHABET.length)
  }
  return `JK-${out}`
}

const STREET_PREFIX = /^(jl\.?|jalan|gg\.?|gang|no\.?|rt|rw|blok)\b/i

/**
 * Ambil nama kota dari alamat lengkap — mencerminkan lib/location.ts.
 *
 * Seed WAJIB mengisi `city`, bukan hanya `location`: filter katalog
 * mencocokkan `provider.city`, jadi database hasil seed tanpa kolom ini
 * membuat filter lokasi tidak menemukan apa pun.
 */
function cityFromLocation(location) {
  if (!location) return null
  const segments = location
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (segments.length === 0) return null
  const city = segments[segments.length - 1].trim()
  if (STREET_PREFIX.test(city)) return null
  return city.trim().toLowerCase()
}

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10)

  // ============ USERS ============
  // avatarUrl memakai pravatar (foto manusia nyata, cache CDN) — setiap email
  // mendapat img deterministik agar reseed tidak ganti wajah acak.
  const userData = [
    // email, name, role, location, avatarUrl
    // Admin
    ["admin@jasakite.id", "Admin JASAKITE", "ADMIN", null, "https://i.pravatar.cc/300?img=1"],
    // Providers — tersebar di 7 kabupaten/kota Provinsi Kepulauan Bangka Belitung.
    // Segmen setelah koma TERAKHIR wajib nama kabupaten/kota (bukan provinsi):
    // `city` diisi dari segmen itu dan filter katalog mencocokkannya persis.
    // Kota Pangkal Pinang
    ["budi.santoso@email.com", "Budi Santoso", "PROVIDER", "Jl. Melati No.12, Pangkal Pinang", "https://i.pravatar.cc/300?img=12"],
    ["joko.wibowo@email.com", "Joko Wibowo", "PROVIDER", "Jl. Depati Amir No.5, Pangkal Pinang", "https://i.pravatar.cc/300?img=14"],
    ["hendri.bangka@email.com", "Hendri Bangka", "PROVIDER", "Jl. Jendral Sudirman No.10, Pangkal Pinang", "https://i.pravatar.cc/300?img=20"],
    // Kabupaten Bangka (Sungailiat)
    ["siti.rahayu@email.com", "Siti Rahayu", "PROVIDER", "Jl. Raya Sungailiat No.22, Sungailiat, Kabupaten Bangka", "https://i.pravatar.cc/300?img=5"],
    ["rina.marlina@email.com", "Rina Marlina", "PROVIDER", "Jl. Pemuda No.9, Sungailiat, Kabupaten Bangka", "https://i.pravatar.cc/300?img=9"],
    ["bangka.jaya@email.com", "Bangka Jaya Antaran", "PROVIDER", "Jl. Air Anyir No.7, Sungailiat, Kabupaten Bangka", "https://i.pravatar.cc/300?img=25"],
    // Kabupaten Bangka Barat (Muntok)
    ["muntok.teknik@email.com", "Muntok Express", "PROVIDER", "Jl. Jenderal Sudirman No.18, Muntok, Kabupaten Bangka Barat", "https://i.pravatar.cc/300?img=13"],
    ["agus.pratama@email.com", "Agus Pratama", "PROVIDER", "Jl. Pelabuhan No.4, Muntok, Kabupaten Bangka Barat", "https://i.pravatar.cc/300?img=15"],
    ["babel.bayar@email.com", "Babel Bayar", "PROVIDER", "Jl. Raya Muntok No.31, Muntok, Kabupaten Bangka Barat", "https://i.pravatar.cc/300?img=17"],
    // Kabupaten Bangka Tengah (Koba)
    ["koba.servis@email.com", "Koba Kurir", "PROVIDER", "Jl. Raya Koba No.12, Koba, Kabupaten Bangka Tengah", "https://i.pravatar.cc/300?img=19"],
    ["yoga.permana@email.com", "Yoga Permana", "PROVIDER", "Jl. Merdeka No.17, Koba, Kabupaten Bangka Tengah", "https://i.pravatar.cc/300?img=18"],
    ["tengah.cat@email.com", "Bangka Tengah Belanja", "PROVIDER", "Jl. Ahmad Yani No.6, Koba, Kabupaten Bangka Tengah", "https://i.pravatar.cc/300?img=24"],
    // Kabupaten Bangka Selatan (Toboali)
    ["toboali.pro@email.com", "Toboali Pro", "PROVIDER", "Jl. Jenderal Sudirman No.8, Toboali, Kabupaten Bangka Selatan", "https://i.pravatar.cc/300?img=28"],
    ["dewi.anggraini@email.com", "Dewi Anggraini", "PROVIDER", "Jl. Pahlawan No.11, Toboali, Kabupaten Bangka Selatan", "https://i.pravatar.cc/300?img=32"],
    ["selatan.pindah@email.com", "Bangka Selatan Titip", "PROVIDER", "Jl. Raya Toboali No.20, Toboali, Kabupaten Bangka Selatan", "https://i.pravatar.cc/300?img=30"],
    // Kabupaten Belitung (Tanjung Pandan)
    ["belitung.prime@email.com", "Belitung Prime", "PROVIDER", "Jl. Hang Tuah No.8, Tanjung Pandan, Kabupaten Belitung", "https://i.pravatar.cc/300?img=21"],
    ["lina.natuna@email.com", "Belitung Belanja", "PROVIDER", "Jl. Sijuk No.3, Tanjung Pandan, Kabupaten Belitung", "https://i.pravatar.cc/300?img=29"],
    ["pindah.belitung@email.com", "Titip Belitung", "PROVIDER", "Jl. Sriwijaya No.14, Tanjung Pandan, Kabupaten Belitung", "https://i.pravatar.cc/300?img=27"],
    // Kabupaten Belitung Timur (Manggar)
    ["manggar.teknik@email.com", "Manggar Kurir", "PROVIDER", "Jl. Raya Manggar No.5, Manggar, Kabupaten Belitung Timur", "https://i.pravatar.cc/300?img=34"],
    ["timur.cat@email.com", "Belitung Timur Bayar", "PROVIDER", "Jl. Merdeka No.22, Manggar, Kabupaten Belitung Timur", "https://i.pravatar.cc/300?img=35"],
    ["gantung.servis@email.com", "Gantung Titip", "PROVIDER", "Jl. Gantung No.9, Manggar, Kabupaten Belitung Timur", "https://i.pravatar.cc/300?img=11"],
    // Customers — tersebar di daerah yang sama
    ["dewi.lestari@email.com", "Dewi Lestari", "CUSTOMER", "Jl. Depati Amir No.12, Pangkal Pinang", "https://i.pravatar.cc/300?img=33"],
    ["citra.bangka@email.com", "Citra Bangka", "CUSTOMER", "Jl. Jendral Sudirman No.24, Pangkal Pinang", "https://i.pravatar.cc/300?img=36"],
    ["ahmad.fauzi@email.com", "Ahmad Fauzi", "CUSTOMER", "Jl. Semabung Lama No.7, Pangkal Pinang", "https://i.pravatar.cc/300?img=68"],
    ["putri.ayu@email.com", "Putri Ayu", "CUSTOMER", "Jl. Raya Sungailiat No.31, Sungailiat, Kabupaten Bangka", "https://i.pravatar.cc/300?img=26"],
    ["bambang.wijaya@email.com", "Bambang Wijaya", "CUSTOMER", "Jl. Pemuda No.2, Sungailiat, Kabupaten Bangka", "https://i.pravatar.cc/300?img=22"],
    ["sari.indah@email.com", "Sari Indah", "CUSTOMER", "Jl. Pelabuhan No.9, Muntok, Kabupaten Bangka Barat", "https://i.pravatar.cc/300?img=31"],
    ["maya.sari@email.com", "Maya Sari", "CUSTOMER", "Jl. Raya Muntok No.15, Muntok, Kabupaten Bangka Barat", "https://i.pravatar.cc/300?img=45"],
    ["doni.kurniawan@email.com", "Doni Kurniawan", "CUSTOMER", "Jl. Raya Koba No.27, Koba, Kabupaten Bangka Tengah", "https://i.pravatar.cc/300?img=48"],
    ["ani.wulandari@email.com", "Ani Wulandari", "CUSTOMER", "Jl. Merdeka No.3, Koba, Kabupaten Bangka Tengah", "https://i.pravatar.cc/300?img=65"],
    ["hasan.basri@email.com", "Hasan Basri", "CUSTOMER", "Jl. Jenderal Sudirman No.40, Toboali, Kabupaten Bangka Selatan", "https://i.pravatar.cc/300?img=37"],
    ["sinta.belitung@email.com", "Sinta Melati", "CUSTOMER", "Jl. Hang Tuah No.21, Tanjung Pandan, Kabupaten Belitung", "https://i.pravatar.cc/300?img=38"],
    ["yusuf.manggar@email.com", "Yusuf Hidayat", "CUSTOMER", "Jl. Raya Manggar No.12, Manggar, Kabupaten Belitung Timur", "https://i.pravatar.cc/300?img=39"],
  ]

  const users = {}
  for (const [email, name, role, location, avatarUrl] of userData) {
    const city = cityFromLocation(location)
    users[email] = await prisma.user.upsert({
      where: { email },
      // `location` WAJIB ikut di-update, bukan hanya `city`: location adalah
      // sumber nilai city, dan alamat lama membuat profil menampilkan
      // "Jakarta Selatan" sementara filter lokasi menyebut "Pangkal Pinang".
      // `name` ikut juga supaya nama akun demo tidak menyimpang dari daftar.
      update: { name, location, city, avatarUrl },
      create: {
        name,
        email,
        passwordHash,
        role,
        location,
        city,
        avatarUrl,
        bio:
          role === "PROVIDER"
            ? `${name} — penyedia jasa profesional yang mengutamakan ketepatan waktu dan kualitas hasil. Melayani area ${location?.split(", ").pop() ?? "sekitar"}.`
            : null,
      },
    })
  }

  // Hapus akun demo lama yang sudah tidak ada di daftar seed.
  //
  // Cakupan wilayah pernah nasional (38 provinsi); setelah dipersempit ke
  // Kepulauan Bangka Belitung, akun penyedia luar provinsi tidak punya jasa
  // lagi tetapi tetap terhitung di KPI admin dan daftar penyedia. Yang dihapus
  // HANYA akun ber-domain demo (@email.com) yang tidak ada di daftar seed —
  // akun pendaftar asli tidak pernah tersentuh.
  const seedEmails = new Set(userData.map((u) => u[0]))
  const demoAccounts = await prisma.user.findMany({
    where: { email: { endsWith: "@email.com" } },
    select: { id: true, email: true },
  })
  const staleIds = demoAccounts
    .filter((u) => !seedEmails.has(u.email))
    .map((u) => u.id)
  if (staleIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: staleIds } } })
  }

  // ============ CATEGORIES ============
  // Empat kategori inti JASAKITE. Kategori lama (perbaikan rumah, kebersihan,
  // instalasi, pengecatan, pindahan, tukang) sudah tidak ditawarkan dan tidak
  // boleh dibuat ulang oleh seed — katalog, hero, dan sitemap semuanya
  // membaca daftar ini.
  const catData = [
    ["Jasa Antar", "jasa-antar", "Bike", "Antar paket, barang, dan dokumen dalam kota hingga antar pulau."],
    ["Jasa Belanja", "jasa-belanja", "ShoppingCart", "Belanja kebutuhan harian ke pasar atau toko sesuai daftar Anda."],
    ["Jasa Pembayaran", "jasa-pembayaran", "CreditCard", "Bantuan bayar tagihan rutin, PPOB, dan cicilan."],
    ["Jasa Titip", "jasa-titip", "Package", "Titip beli dan titip antar barang lewat penyedia di sekitar Anda."],
  ]
  const categories = {}
  for (const [name, slug, icon, description] of catData) {
    categories[slug] = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug, icon, description },
    })
  }

  // ============ CLEAN OLD DATA ============
  // Urutannya penting, dan dua baris pertama dulu HILANG.
  //
  // Prisma menolak menghapus induk selama masih ada anak yang mereferensikannya
  // (P2014). `message` menunjuk `order`,
  // dan `savedService` menunjuk `service`. Tanpa keduanya, `npm run db:seed`
  // gagal dengan "would violate the required relation SavedServiceToService"
  // pada database apa pun yang pernah memakai fitur simpan jasa atau chat —
  // justru database yang paling sering dipakai saat pengembangan.
  await prisma.review.deleteMany()
  await prisma.message.deleteMany()
  await prisma.savedService.deleteMany()
  // Fitur baru: notifikasi, keranjang, buku alamat, voucher, dan banner.
  // voucherRedemption SEBELUM voucher (anak → induk, sama seperti di atas).
  await prisma.notification.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.voucherRedemption.deleteMany()
  await prisma.voucher.deleteMany()
  await prisma.promoBanner.deleteMany()
  await prisma.address.deleteMany()
  // servicePackage menyimpan serviceId — harus dihapus SEBELUM service
  // (anak → induk, urutan sama dengan message/savedService).
  await prisma.servicePackage.deleteMany()
  await prisma.order.deleteMany()
  await prisma.service.deleteMany()
  // Riwayat langganan ikut di-reset: seed memberi masa aktif baru ke semua
  // penyedia, dan membiarkan baris lama membuat riwayat demo berisi periode
  // yang tidak pernah dibayar.
  await prisma.providerSubscription.deleteMany()

  // Kategori yang tidak ada lagi di katalog produk (sisa kategori lama)
  // dihapus setelah jasanya hilang, bukan sebelumnya — Prisma menolak
  // menghapus induk yang masih punya anak.
  const seededCategorySlugs = catData.map(([, slug]) => slug)
  await prisma.category.deleteMany({
    where: { slug: { notIn: seededCategorySlugs } },
  })

  // ============ LANGGANAN PENYEDIA ============
  // Katalog hanya menampilkan jasa milik penyedia dengan masa aktif berjalan.
  // Tanpa grant ini, seluruh jasa hasil seed langsung tersembunyi dan demo
  // tampak kosong padahal datanya lengkap. Dicatat sebagai ADMIN_GRANT
  // (nominal 0) karena tidak ada uang yang dipotong saat seeding.
  const subscriptionEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const seededProviders = await prisma.user.findMany({
    where: { role: "PROVIDER" },
    select: { id: true },
  })
  for (const provider of seededProviders) {
    await prisma.user.update({
      where: { id: provider.id },
      data: { subscriptionUntil: subscriptionEnd },
    })
    await prisma.providerSubscription.create({
      data: {
        providerId: provider.id,
        amount: 0,
        periodStart: new Date(),
        periodEnd: subscriptionEnd,
        status: "ACTIVE",
        source: "ADMIN_GRANT",
      },
    })
  }


  // ============ SERVICES ============
  // Foto dari Unsplash (lisensi bebas). URL memakai parameter crop agar
  // rasio seragam untuk kartu katalog maupun galeri detail.
  const img = (id) =>
    `https://images.unsplash.com/${id}?q=80&w=1200&auto=format&fit=crop`

  // Foto per tema. Semua URL sudah diperiksa merespons 200 dan isinya sesuai
  // tema (kurir, paket, pasar, kasir, tagihan, titipan) — bukan sekadar
  // "gambar yang tidak rusak".
  const PHOTO = {
    kurir: img("photo-1526367790999-0150786686a2"),
    paket: img("photo-1580674285054-bed31e145f59"),
    gudang: img("photo-1587293852726-70cdb56c2866"),
    pasar: img("photo-1542838132-92c53300491e"),
    belanjaan: img("photo-1588964895597-cfccd6e2dbf9"),
    kasir: img("photo-1556742049-0cfed4f6a45d"),
    terminal: img("photo-1601597111158-2fceff292cdc"),
    tagihan: img("photo-1554224155-6726b3ff858f"),
    nirsentuh: img("photo-1556742502-ec7c0e9f34b1"),
    ponsel: img("photo-1616077168712-fc6c788db4af"),
    kotak: img("photo-1595246140625-573b715d11dc"),
  }

  const serviceData = [
    // slug, kategori, provider email, deskripsi, harga, hari, foto
    // Judul jasa DITURUNKAN dari slug, jadi nama daerah di slug wajib sama
    // dengan daerah penyedianya — penjaga di bawah array ini yang memaksa.
    //
    // Jasa Antar — Pangkal Pinang, Sungailiat, Muntok, Koba, Toboali,
    // Tanjung Pandan, Manggar
    ["antar-paket-dokumen-pangkal-pinang", "jasa-antar", "budi.santoso@email.com", "Antar dokumen dan paket kecil se-Kota Pangkal Pinang dengan motor. Titik jemput fleksibel, foto bukti pengiriman dikirim lewat chat setelah barang diterima.", 15000, 1, PHOTO.kurir],
    ["antar-belanja-pasar-sungailiat", "jasa-antar", "siti.rahayu@email.com", "Antar hasil belanja pasar dari Sungailiat ke alamat Anda. Cocok untuk pesanan sayur, buah, dan lauk yang harus segera sampai.", 20000, 1, PHOTO.paket],
    ["kurir-motor-muntok", "jasa-antar", "muntok.teknik@email.com", "Kurir motor untuk paket dan makanan di Muntok, Kabupaten Bangka Barat. Pengantaran hari yang sama untuk pesanan sebelum pukul 16.00.", 12000, 1, PHOTO.kurir],
    ["antar-barang-koba", "jasa-antar", "koba.servis@email.com", "Antar barang berukuran sedang di area Koba dengan motor bak. Termasuk pengikatan barang dan bantuan menaikkan ke kendaraan.", 25000, 1, PHOTO.gudang],
    ["antar-paket-toboali", "jasa-antar", "toboali.pro@email.com", "Pengantaran paket dalam Kota Toboali dan sekitarnya. Status pengiriman diperbarui lewat chat: dijemput, di jalan, dan diterima.", 18000, 1, PHOTO.paket],
    ["antar-dokumen-tanjung-pandan", "jasa-antar", "belitung.prime@email.com", "Antar dokumen dan berkas kantor di Tanjung Pandan. Bisa menunggu tanda terima bila dokumen perlu diserahkan langsung.", 15000, 1, PHOTO.kurir],
    ["pengiriman-paket-manggar", "jasa-antar", "manggar.teknik@email.com", "Antar paket area Manggar dan Belitung Timur. Barang dibungkus ulang bila kemasan aslinya sudah tidak aman.", 20000, 1, PHOTO.gudang],
    // Jasa Belanja — Pangkal Pinang, Sungailiat, Muntok, Koba, Toboali,
    // Tanjung Pandan, Manggar
    ["belanja-harian-pangkal-pinang", "jasa-belanja", "joko.wibowo@email.com", "Belanja kebutuhan harian sesuai daftar Anda di pasar dan minimarket Pangkal Pinang. Struk asli disertakan, sisa uang dikembalikan.", 30000, 1, PHOTO.pasar],
    ["belanja-pasar-sungailiat", "jasa-belanja", "rina.marlina@email.com", "Titip belanja sayur, ikan, dan bumbu dapur di pasar Sungailiat. Dipilih langsung dengan foto sebelum dibayar.", 25000, 1, PHOTO.belanjaan],
    ["belanja-bulanan-muntok", "jasa-belanja", "agus.pratama@email.com", "Belanja bulanan keluarga di Muntok: sembako, sabun, dan kebutuhan dapur. Daftar panjang dikerjakan sekaligus, barang diantar ke rumah.", 40000, 2, PHOTO.pasar],
    ["belanja-sembako-koba", "jasa-belanja", "yoga.permana@email.com", "Belanja sembako di Koba dengan harga toko, bukan harga jasa. Ongkos jasa terpisah dan sudah tertera di halaman ini.", 30000, 1, PHOTO.belanjaan],
    ["belanja-obat-toboali", "jasa-belanja", "dewi.anggraini@email.com", "Beli obat bebas dan kebutuhan apotek di Toboali. Resep dibacakan lewat chat, obat diantar lengkap dengan struk.", 35000, 1, PHOTO.kasir],
    ["belanja-kebutuhan-tanjung-pandan", "jasa-belanja", "lina.natuna@email.com", "Belanja kebutuhan rumah tangga di Tanjung Pandan, dari bahan masakan sampai perlengkapan mandi. Bisa sekalian antar ke alamat tujuan.", 30000, 1, PHOTO.pasar],
    ["belanja-pasar-manggar", "jasa-belanja", "timur.cat@email.com", "Titip belanja pasar Manggar untuk sayur, buah, dan lauk segar. Belanja pagi, diantar sebelum makan siang.", 25000, 1, PHOTO.belanjaan],
    // Jasa Pembayaran — Pangkal Pinang, Sungailiat, Muntok, Koba, Toboali,
    // Tanjung Pandan, Manggar
    ["bayar-ppob-pangkal-pinang", "jasa-pembayaran", "hendri.bangka@email.com", "Bantu bayar tagihan rutin dan PPOB di Pangkal Pinang: air, internet, pulsa, dan cicilan. Bukti bayar resmi dikirim lewat chat.", 10000, 1, PHOTO.kasir],
    ["bantu-bayar-tagihan-sungailiat", "jasa-pembayaran", "bangka.jaya@email.com", "Bantuan pembayaran tagihan bulanan di Sungailiat tanpa harus antre. Cukup kirim nomor pelanggan, bukti transfer diteruskan ke Anda.", 10000, 1, PHOTO.tagihan],
    ["bayar-tagihan-muntok", "jasa-pembayaran", "babel.bayar@email.com", "Layanan bayar tagihan di Muntok untuk warga yang tidak sempat ke loket. Nominal tagihan dicek dulu sebelum uang ditransfer.", 12000, 1, PHOTO.terminal],
    ["bayar-ppob-koba", "jasa-pembayaran", "tengah.cat@email.com", "Pembayaran PPOB dan tagihan rumah tangga di Koba. Dikerjakan pada hari yang sama, struk dikirim sebagai bukti.", 10000, 1, PHOTO.tagihan],
    ["bayar-tagihan-toboali", "jasa-pembayaran", "selatan.pindah@email.com", "Bantu bayar tagihan dan cicilan di Toboali. Anda hanya perlu mengirim nomor tagihan dan nominalnya, sisanya diurus.", 12000, 1, PHOTO.nirsentuh],
    ["bayar-ppob-tanjung-pandan", "jasa-pembayaran", "pindah.belitung@email.com", "Pembayaran tagihan rutin di Tanjung Pandan, termasuk pulsa dan paket data. Bukti bayar dikirim lengkap dengan nomor referensi.", 10000, 1, PHOTO.kasir],
    ["bayar-tagihan-manggar", "jasa-pembayaran", "gantung.servis@email.com", "Bantuan bayar tagihan bulanan di Manggar dan Belitung Timur. Bisa dikerjakan untuk beberapa tagihan sekaligus dalam satu pesanan.", 12000, 1, PHOTO.tagihan],
    // Jasa Titip — Pangkal Pinang, Sungailiat, Muntok, Koba, Toboali,
    // Tanjung Pandan, Manggar
    ["titip-beli-makanan-pangkal-pinang", "jasa-titip", "budi.santoso@email.com", "Titip beli makanan dan minuman di Pangkal Pinang, dari warung sampai restoran. Pesanan dipesan sesuai jam yang Anda minta.", 20000, 1, PHOTO.kotak],
    ["titip-beli-obat-sungailiat", "jasa-titip", "siti.rahayu@email.com", "Titip beli obat dan kebutuhan apotek di Sungailiat. Foto kemasan dikirim sebelum dibayar supaya tidak salah merek.", 25000, 1, PHOTO.ponsel],
    ["titip-barang-muntok", "jasa-titip", "agus.pratama@email.com", "Titip beli barang dari toko di Muntok dan antar ke alamat Anda. Barang dicek kondisi sebelum diserahkan.", 30000, 1, PHOTO.kotak],
    ["titip-beli-koba", "jasa-titip", "koba.servis@email.com", "Titip beli kebutuhan kecil di Koba: alat tulis, baterai, sampai paket kiriman. Ongkos jasa tetap, berapa pun jumlah barangnya.", 20000, 1, PHOTO.paket],
    ["titip-paket-toboali", "jasa-titip", "dewi.anggraini@email.com", "Titip terima dan antar paket di Toboali untuk Anda yang sedang di luar kota. Paket disimpan aman sampai diambil.", 25000, 1, PHOTO.gudang],
    ["titip-beli-tanjung-pandan", "jasa-titip", "belitung.prime@email.com", "Titip beli oleh-oleh dan makanan khas Belitung dari Tanjung Pandan. Dikemas rapi supaya aman dibawa pulang.", 20000, 1, PHOTO.ponsel],
    ["titip-barang-manggar", "jasa-titip", "manggar.teknik@email.com", "Titip beli dan antar barang di Manggar. Bisa juga untuk mengambil barang yang sudah dipesan di toko lain.", 25000, 1, PHOTO.kotak],
    // Contoh status non-aktif: satu DRAFT (menunggu moderasi) dan satu
    // ARCHIVED (disembunyikan penyedia), supaya halaman moderasi punya isi.
    ["titip-hewan-manggar", "jasa-titip", "gantung.servis@email.com", "Titip antar hewan peliharaan kecil di Manggar dengan kandang angkut. Perlu konfirmasi jadwal sebelum memesan.", 50000, 2, PHOTO.kotak],
    ["antar-furnitur-pangkal-pinang", "jasa-antar", "joko.wibowo@email.com", "Antar furnitur besar di Pangkal Pinang dengan kendaraan bak. Butuh dua orang untuk bongkar muat.", 150000, 2, PHOTO.gudang],
  ]

  // ============ PENJAGA: DAERAH DI JUDUL = DAERAH PENYEDIA ============
  //
  // Filter lokasi mencocokkan `provider.city`, sedangkan judul jasa diturunkan
  // dari slug. Slug yang menyebut daerah lain membuat demo bertengkar dengan
  // dirinya sendiri: menyaring "Kabupaten Bangka" menampilkan jasa berjudul
  // "… Pangkal Pinang". Kesalahan seperti itu tidak akan terlihat dari jumlah
  // hasil (totalnya tetap benar), jadi diperiksa di sini dan gagal keras.
  //
  // Token di bawah hanya nama daerah yang TIDAK ambigu. "bangka" dan
  // "belitung" sengaja tidak ada: keduanya bisa berarti pulau/provinsi
  // (mis. "antar-barang-lintas-pulau-bangka-belitung") sehingga tidak bisa dipakai
  // untuk menyimpulkan satu kabupaten.
  const AREA_TOKENS = {
    "pangkal-pinang": "pangkal pinang",
    sungailiat: "kabupaten bangka",
    muntok: "kabupaten bangka barat",
    koba: "kabupaten bangka tengah",
    toboali: "kabupaten bangka selatan",
    "tanjung-pandan": "kabupaten belitung",
    manggar: "kabupaten belitung timur",
  }
  const cityByEmail = Object.fromEntries(
    userData
      .filter(([, , role]) => role === "PROVIDER")
      .map(([email, , , location]) => [email, cityFromLocation(location)])
  )
  for (const [slug, , email] of serviceData) {
    const areas = new Set(
      Object.entries(AREA_TOKENS)
        .filter(([token]) => slug.includes(token))
        .map(([, city]) => city)
    )
    // Jasa tanpa nama daerah (mis. "jasa-bangun-pagar-tembok") tidak diperiksa.
    if (areas.size === 0) continue
    if (areas.size > 1) {
      throw new Error(
        `Seed: slug "${slug}" menyebut lebih dari satu kabupaten/kota (${[...areas].join(", ")}). Pakai satu daerah saja atau buang nama daerahnya.`
      )
    }
    const [expected] = [...areas]
    const actual = cityByEmail[email]
    if (actual !== expected) {
      throw new Error(
        `Seed: slug "${slug}" menyebut ${expected}, tetapi penyedia ${email} ber-city "${actual}". Filter lokasi akan menampilkan jasa ini di daerah yang salah.`
      )
    }
  }

  // Pool galeri per kategori — 2 foto tambahan selain foto utama, agar detail
  // jasa punya carousel 3 gambar tanpa harus cari foto baru per jasa.
  const galleryPool = {
    "jasa-antar": [PHOTO.kurir, PHOTO.paket, PHOTO.gudang, PHOTO.kotak],
    "jasa-belanja": [PHOTO.pasar, PHOTO.belanjaan, PHOTO.kasir, PHOTO.kotak],
    "jasa-pembayaran": [PHOTO.kasir, PHOTO.tagihan, PHOTO.terminal, PHOTO.nirsentuh],
    "jasa-titip": [PHOTO.kotak, PHOTO.paket, PHOTO.ponsel, PHOTO.gudang],
  }

  const services = []
  for (const [slug, catSlug, email, description, price, days, imageUrl] of serviceData) {
    const pool = galleryPool[catSlug] || []
    const extras = pool.filter((u) => u !== imageUrl).slice(0, 2)
    const service = await prisma.service.create({
      data: {
        title: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        slug: `${slug}-${Math.floor(Math.random() * 100000)}`,
        description,
        price,
        deliveryTimeDays: days,
        imageUrl,
        images: extras.length ? JSON.stringify(extras) : null,
        categoryId: categories[catSlug].id,
        providerId: users[email].id,
        status: slug === "antar-furnitur-pangkal-pinang" ? "ARCHIVED" : slug === "titip-hewan-manggar" ? "DRAFT" : "ACTIVE",
        createdAt: daysAgo(Math.floor(Math.random() * 60) + 5),
      },
    })
    services.push(service)
  }

  // ============ PAKET TIER ============
  // Data demo sekelas seed lainnya: 3 paket per jasa aktif, harga turunan
  // deterministik dari harga dasar (tanpa Math.random agar reseed stabil).
  // Jasa DRAFT/ARCHIVED sengaja tanpa paket — sama dengan kondisi produksi
  // jasa provider yang mengisi sendiri.
  let packageCount = 0
  for (const service of services) {
    if (service.status !== "ACTIVE") continue
    const base = service.price
    const days = service.deliveryTimeDays
    const tiers = [
      {
        name: "Basic",
        price: Math.round(base),
        deliveryTimeDays: days,
        position: 0,
        features: [
          "Pekerjaan inti sesuai deskripsi jasa",
          "Koordinasi jadwal lewat pesan",
        ],
      },
      {
        name: "Standard",
        price: Math.round(base * 1.5),
        deliveryTimeDays: days,
        position: 1,
        features: [
          "Pekerjaan inti sesuai deskripsi jasa",
          "Pengecekan menyeluruh sebelum diserahkan",
          "Garansi pengerjaan ulang 7 hari",
        ],
      },
      {
        name: "Premium",
        price: Math.round(base * 2.2),
        deliveryTimeDays: days + 1,
        position: 2,
        features: [
          "Semua isi paket Standard",
          "Pekerjaan tambahan minor tanpa biaya tambahan",
          "Garansi pengerjaan ulang 30 hari",
        ],
      },
    ]
    for (const tier of tiers) {
      await prisma.servicePackage.create({
        data: { ...tier, serviceId: service.id },
      })
      packageCount++
    }
  }

  // ============ ORDERS + REVIEWS ============
  const customers = [
    users["ahmad.fauzi@email.com"],
    users["putri.ayu@email.com"],
    users["bambang.wijaya@email.com"],
    users["sari.indah@email.com"],
    users["doni.kurniawan@email.com"],
    users["maya.sari@email.com"],
    users["dewi.lestari@email.com"],
    users["ani.wulandari@email.com"],
  ]

  const REVIEW_COMMENTS = [
    "Antarnya cepat dan barang sampai utuh. Update status dikirim tanpa perlu ditanya.",
    "Komunikatif dari awal sampai paket diterima. Pasti pakai lagi untuk kiriman berikutnya.",
    "Titip belanja sesuai daftar, struk asli disertakan. Sisa uang dikembalikan tanpa diminta.",
    "Belanjaannya lengkap dan sayurnya masih segar. Daftar yang saya tulis dipatuhi semua.",
    "Bantu bayar tagihan selesai hari itu juga, bukti bayarnya jelas. Tidak ada biaya tersembunyi.",
    "Sangat membantu waktu saya sedang di luar kota. Tagihan tetap dibayar tepat waktu.",
    "Titip beli makanan sesuai jam yang saya minta. Pesanan masih hangat saat sampai.",
    "Harga jasa wajar dan komunikasinya enak. Cocok untuk kebutuhan mendadak.",
    "Barang titipan dikemas rapi dan dicek dulu sebelum diantar. Profesional.",
    "Respon cepat di chat, jemput paket sesuai jadwal. Sudah tiga kali pakai dan konsisten.",
    "Belanja pasar dibantu pilih, dikirim foto sebelum dibayar. Jadi tidak salah beli.",
    "Bayar tagihan beberapa sekaligus dalam satu pesanan, praktis sekali.",
    "Kurirnya sabar menunggu saya siapkan barang. Terima kasih atas kesabarannya.",
    "Titipan sampai tepat waktu dan kondisinya sesuai yang saya minta.",
  ]

  for (const service of services) {
    const orderCount = service.status === "ACTIVE" ? 2 + Math.floor(Math.random() * 6) : 0
    let reviewCount = 0

    for (let i = 0; i < orderCount; i++) {
      const customer = customers[Math.floor(Math.random() * customers.length)]
      const isCompleted = Math.random() > 0.25
      const createdDaysAgo = Math.floor(Math.random() * 60) + 2

      const orderNotes = [
        "Mohon konfirmasi jadwal sebelum datang, terima kasih.",
        "Rumah kosong, bisa datang kapan saja.",
        "Tolong bawa alat lengkap ya, terima kasih.",
        "Saya ada di lokasi, hubungi dulu sebelum datang.",
        null,
        null,
      ][Math.floor(Math.random() * 6)]

      // Alamat pelaksanaan selalu di dalam provinsi: 7 kabupaten/kota.
      const addressSamples = [
        "Jl. Melati No.12, Pangkal Pinang, Kepulauan Bangka Belitung",
        "Jl. Depati Amir No.5, Pangkal Pinang, Kepulauan Bangka Belitung",
        "Jl. Jendral Sudirman No.10, Sungailiat, Kabupaten Bangka, Kepulauan Bangka Belitung",
        "Jl. Pemuda No.9, Sungailiat, Kabupaten Bangka, Kepulauan Bangka Belitung",
        "Jl. Pelabuhan No.4, Muntok, Kabupaten Bangka Barat, Kepulauan Bangka Belitung",
        "Jl. Raya Muntok No.31, Muntok, Kabupaten Bangka Barat, Kepulauan Bangka Belitung",
        "Jl. Raya Koba No.12, Koba, Kabupaten Bangka Tengah, Kepulauan Bangka Belitung",
        "Jl. Merdeka No.17, Koba, Kabupaten Bangka Tengah, Kepulauan Bangka Belitung",
        "Jl. Jenderal Sudirman No.8, Toboali, Kabupaten Bangka Selatan, Kepulauan Bangka Belitung",
        "Jl. Pahlawan No.11, Toboali, Kabupaten Bangka Selatan, Kepulauan Bangka Belitung",
        "Jl. Hang Tuah No.8, Tanjung Pandan, Kabupaten Belitung, Kepulauan Bangka Belitung",
        "Jl. Sriwijaya No.14, Tanjung Pandan, Kabupaten Belitung, Kepulauan Bangka Belitung",
        "Jl. Raya Manggar No.5, Manggar, Kabupaten Belitung Timur, Kepulauan Bangka Belitung",
        "Jl. Gantung No.9, Manggar, Kabupaten Belitung Timur, Kepulauan Bangka Belitung",
      ]
      const address = addressSamples[Math.floor(Math.random() * addressSamples.length)]
      const deadline = Math.random() > 0.5 ? daysAgo(-Math.floor(Math.random() * 7) - 1) : null
      const status = isCompleted ? "COMPLETED" : Math.random() > 0.5 ? "PENDING" : "IN_PROGRESS"
      // Cap waktu tiap tahap diisi KONSISTEN dengan statusnya dan berurutan:
      // dibuat → diterima → selesai. Timeline di UI membacanya apa adanya, jadi
      // data demo yang urutannya terbalik akan memamerkan timeline yang bohong.
      const order = await prisma.order.create({
        data: {
          code: demoOrderCode(++demoOrderSeq),
          customerId: customer.id,
          serviceId: service.id,
          subtotal: service.price,
          discountAmount: 0,
          totalPrice: service.price,
          status,
          paymentMethod: ["transfer", "ewallet", "cod"][Math.floor(Math.random() * 3)],
          orderNotes,
          address,
          deadline,
          createdAt: daysAgo(createdDaysAgo),
          acceptedAt: status === "PENDING" ? null : daysAgo(Math.max(1, createdDaysAgo - 1)),
          completedAt: isCompleted ? daysAgo(Math.max(1, createdDaysAgo - 2)) : null,
        },
      })

      if (isCompleted && Math.random() > 0.15) {
        reviewCount++
        const rating = Math.random() > 0.35 ? 5 : 4
        await prisma.review.create({
          data: {
            orderId: order.id,
            reviewerId: customer.id,
            rating,
            comment: REVIEW_COMMENTS[Math.floor(Math.random() * REVIEW_COMMENTS.length)],
            createdAt: new Date(order.completedAt.getTime() + 86400000),
          },
        })
      }
    }

    // Sinkronkan ratingAvg & totalReviews
    if (service.status === "ACTIVE") {
      const reviews = await prisma.review.findMany({
        where: { order: { serviceId: service.id } },
        select: { rating: true },
      })
      if (reviews.length > 0) {
        const ratingAvg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        await prisma.service.update({
          where: { id: service.id },
          data: { totalReviews: reviews.length, ratingAvg },
        })
      }
    }
  }

  // ============ BUKU ALAMAT DEMO ============
  // Setiap akun customer demo mendapat satu alamat tersimpan, diturunkan dari
  // alamat profilnya supaya kolom `city` tetap salah satu dari 7 kabupaten/kota.
  // Tanpa ini halaman checkout tidak punya apa pun untuk dipilih dan fitur buku
  // alamat tidak bisa dicoba sama sekali.
  let addressCount = 0
  for (const [email, name, role, location] of userData) {
    if (role !== "CUSTOMER") continue
    const city = cityFromLocation(location)
    if (!city) continue
    const street = location.split(",")[0]?.trim() || location
    await prisma.address.create({
      data: {
        userId: users[email].id,
        label: "Rumah",
        recipient: name,
        phone: `0812${String(10000000 + addressCount * 137).slice(0, 8)}`,
        street,
        city,
        note: addressCount % 3 === 0 ? "Pagar hijau, sebelah warung kopi" : null,
        isDefault: true,
      },
    })
    addressCount++
  }

  // ============ VOUCHER ============
  // Bukan angka hias: KUOTAHABIS sengaja berkuota habis supaya jalur penolakan
  // bisa diuji tanpa mengubah data manual lebih dulu.
  const voucherData = [
    // code, title, type, value, minSpend, maxDiscount, quota, perUser, scopeCity, description
    ["BABELBARU", "Diskon 20% pengguna baru", "PERCENT", 20, 100000, 50000, 200, 1, null, "Berlaku di seluruh Kepulauan Bangka Belitung, maksimal potongan Rp50.000"],
    ["HEMAT50K", "Potongan Rp50.000", "FIXED", 50000, 300000, null, 100, 1, null, "Minimal belanja Rp300.000"],
    ["PANGKAL15", "Diskon 15% khusus Pangkal Pinang", "PERCENT", 15, 150000, 30000, 50, 1, "pangkal pinang", "Hanya berlaku untuk alamat di Kota Pangkal Pinang"],
    ["KUOTAHABIS", "Voucher contoh kuota habis", "FIXED", 25000, 100000, null, 5, 1, null, "Kuotanya sudah habis — dipakai untuk menguji penolakan"],
  ]
  let voucherCount = 0
  for (const [
    code,
    title,
    type,
    value,
    minSpend,
    maxDiscount,
    quota,
    perUser,
    scopeCity,
    description,
  ] of voucherData) {
    await prisma.voucher.create({
      data: {
        code,
        title,
        description,
        type,
        value,
        minSpend,
        maxDiscount,
        quota,
        usedCount: code === "KUOTAHABIS" ? quota : 0,
        perUser,
        scopeCity,
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000),
        isActive: true,
      },
    })
    voucherCount++
  }

  // ============ BANNER PROMO ============
  // `tone` memilih token warna semantik yang sudah lolos kontras AA — banner
  // tidak boleh menjadi tempat pertama kontras gagal.
  const bannerData = [
    // title, subtitle, href, tone, position
    ["Diskon hingga Rp50.000", "Pakai kode HEMAT50K, min. belanja Rp300.000", "/services", "primary", 0],
    ["Penyedia di 7 kabupaten/kota", "Dari Pangkal Pinang sampai Belitung Timur", "/services", "info", 1],
    ["Punya keahlian? Buka jasa", "Gratis, tanpa biaya pendaftaran", "/register", "success", 2],
  ]
  for (const [title, subtitle, href, tone, position] of bannerData) {
    await prisma.promoBanner.create({
      data: {
        title,
        subtitle,
        href,
        tone,
        position,
        endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000),
        isActive: true,
      },
    })
  }

  console.log("Seed selesai!")
  console.log(`  ${userData.filter((u) => u[2] === "PROVIDER").length} penyedia jasa terverifikasi`)
  console.log(`  ${addressCount} alamat tersimpan`)
  console.log(`  ${voucherCount} voucher (1 sengaja habis kuotanya)`)
  console.log(`  ${bannerData.length} banner promo`)
  if (staleIds.length > 0) console.log(`  ${staleIds.length} akun demo lama dibersihkan`)
  console.log(`  ${services.length} jasa (${services.filter((s) => s.status === "ACTIVE").length} aktif)`)
  console.log(`  ${packageCount} paket tier`)
  console.log("Akun demo (password: password123):")
  console.log("  admin@jasakite.id (ADMIN)")
  for (const email of userData.slice(1, 9).map((u) => u[0])) {
    console.log(`  ${email}`)
  }
  console.log(
    `  + ${userData.filter((u) => u[2] === "CUSTOMER").length} akun customer`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())