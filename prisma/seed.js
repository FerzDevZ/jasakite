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
    ["bangka.jaya@email.com", "Bangka Jaya Servis", "PROVIDER", "Jl. Air Anyir No.7, Sungailiat, Kabupaten Bangka", "https://i.pravatar.cc/300?img=25"],
    // Kabupaten Bangka Barat (Muntok)
    ["muntok.teknik@email.com", "Muntok Teknik", "PROVIDER", "Jl. Jenderal Sudirman No.18, Muntok, Kabupaten Bangka Barat", "https://i.pravatar.cc/300?img=13"],
    ["agus.pratama@email.com", "Agus Pratama", "PROVIDER", "Jl. Pelabuhan No.4, Muntok, Kabupaten Bangka Barat", "https://i.pravatar.cc/300?img=15"],
    ["babel.listrik@email.com", "Babel Listrik", "PROVIDER", "Jl. Raya Muntok No.31, Muntok, Kabupaten Bangka Barat", "https://i.pravatar.cc/300?img=17"],
    // Kabupaten Bangka Tengah (Koba)
    ["koba.servis@email.com", "Koba Servis", "PROVIDER", "Jl. Raya Koba No.12, Koba, Kabupaten Bangka Tengah", "https://i.pravatar.cc/300?img=19"],
    ["yoga.permana@email.com", "Yoga Permana", "PROVIDER", "Jl. Merdeka No.17, Koba, Kabupaten Bangka Tengah", "https://i.pravatar.cc/300?img=18"],
    ["tengah.cat@email.com", "Bangka Tengah Cat", "PROVIDER", "Jl. Ahmad Yani No.6, Koba, Kabupaten Bangka Tengah", "https://i.pravatar.cc/300?img=24"],
    // Kabupaten Bangka Selatan (Toboali)
    ["toboali.pro@email.com", "Toboali Pro", "PROVIDER", "Jl. Jenderal Sudirman No.8, Toboali, Kabupaten Bangka Selatan", "https://i.pravatar.cc/300?img=28"],
    ["dewi.anggraini@email.com", "Dewi Anggraini", "PROVIDER", "Jl. Pahlawan No.11, Toboali, Kabupaten Bangka Selatan", "https://i.pravatar.cc/300?img=32"],
    ["selatan.pindah@email.com", "Bangka Selatan Pindahan", "PROVIDER", "Jl. Raya Toboali No.20, Toboali, Kabupaten Bangka Selatan", "https://i.pravatar.cc/300?img=30"],
    // Kabupaten Belitung (Tanjung Pandan)
    ["belitung.prime@email.com", "Belitung Prime", "PROVIDER", "Jl. Hang Tuah No.8, Tanjung Pandan, Kabupaten Belitung", "https://i.pravatar.cc/300?img=21"],
    ["lina.natuna@email.com", "Belitung Bersih", "PROVIDER", "Jl. Sijuk No.3, Tanjung Pandan, Kabupaten Belitung", "https://i.pravatar.cc/300?img=29"],
    ["pindah.belitung@email.com", "Pindah Belitung", "PROVIDER", "Jl. Sriwijaya No.14, Tanjung Pandan, Kabupaten Belitung", "https://i.pravatar.cc/300?img=27"],
    // Kabupaten Belitung Timur (Manggar)
    ["manggar.teknik@email.com", "Manggar Teknik", "PROVIDER", "Jl. Raya Manggar No.5, Manggar, Kabupaten Belitung Timur", "https://i.pravatar.cc/300?img=34"],
    ["timur.cat@email.com", "Belitung Timur Cat", "PROVIDER", "Jl. Merdeka No.22, Manggar, Kabupaten Belitung Timur", "https://i.pravatar.cc/300?img=35"],
    ["gantung.servis@email.com", "Gantung Servis", "PROVIDER", "Jl. Gantung No.9, Manggar, Kabupaten Belitung Timur", "https://i.pravatar.cc/300?img=11"],
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
  const catData = [
    ["Perbaikan Rumah", "perbaikan-rumah", "Wrench", "Perbaikan AC, pipa, dan peralatan rumah tangga."],
    ["Kebersihan", "kebersihan", "Sparkles", "Jasa bersih-bersih rumah, kantor, dan pasca renovasi."],
    ["Listrik", "listrik", "Zap", "Instalasi dan perbaikan instalasi listrik."],
    ["Pengecatan", "pengecatan", "Paintbrush", "Cat tembok interior dan eksterior."],
    ["Pindahan", "pindahan", "Truck", "Jasa pindah rumah dan kantor."],
    ["Tukang", "tukang", "Home", "Tukang bangunan dan renovasi."],
    ["Jasa Titip", "jasa-titip", "Package", "Titip beli dan titip antar barang lewat penyedia di sekitar Anda."],
    ["Jasa Antar", "jasa-antar", "Bike", "Antar paket, barang, dan dokumen dalam kota hingga antar pulau."],
    ["Jasa Pembayaran", "jasa-pembayaran", "CreditCard", "Bantuan bayar tagihan listrik, air, PPOB, dan sejenisnya."],
    ["Jasa Belanja", "jasa-belanja", "ShoppingCart", "Belanja kebutuhan harian ke pasar atau toko sesuai daftar Anda."],
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

  // ============ SERVICES ============
  // Foto dari Unsplash (lisensi bebas). URL memakai parameter crop agar
  // rasio seragam untuk kartu katalog maupun galeri detail.
  const img = (id) =>
    `https://images.unsplash.com/${id}?q=80&w=1200&auto=format&fit=crop`

  const serviceData = [
    // slug, kategori, provider email, deskripsi, harga, hari, foto
    // Judul jasa DITURUNKAN dari slug, jadi nama daerah di slug wajib sama
    // dengan daerah penyedianya — penjaga di bawah array ini yang memaksa.
    // Perbaikan Rumah — Pangkal Pinang, Muntok, Koba
    ["instalasi-ac-split-pangkal-pinang", "perbaikan-rumah", "budi.santoso@email.com", "Instalasi AC split 1 PK baru di Pangkal Pinang: bracket, pipa, vacuum, dan pengecekan tekanan freon. Garansi 1 bulan untuk kerjaan.", 350000, 1, img("photo-1753826477307-82c71f3d9537")],
    ["servis-ac-bocor-tidak-dingin-pangkal-pinang", "perbaikan-rumah", "budi.santoso@email.com", "Pengecekan menyeluruh, cuci evaporator dan kondensor, tambah freon R410A, perbaikan kebocoran. Dijamin dingin kembali atau uang kembali.", 150000, 1, img("photo-1754665099555-dea88285e4ec")],
    ["perbaikan-mesin-cuci-1-2-tabung-pangkal-pinang", "perbaikan-rumah", "joko.wibowo@email.com", "Perbaikan mesin cuci 1 dan 2 tabung: tidak berputar, bocor, atau bunyi kasar. Termasuk penggantian sparepart standar.", 175000, 2, img("photo-1626806787461-102c1bfaaea1")],
    ["pembersihan-kulkas-steam-pangkal-pinang", "perbaikan-rumah", "joko.wibowo@email.com", "Pembersihan mendalam kulkas dengan steam, pengecekan kompresor, penggantian seal pintu bila perlu. Melayani seluruh Kota Pangkal Pinang.", 120000, 1, img("photo-1584568694244-14fbdf83bd30")],
    ["perbaikan-water-heater-pangkal-pinang", "perbaikan-rumah", "budi.santoso@email.com", "Perbaikan water heater di Pangkal Pinang: tidak panas, bocor, atau error. Termasuk pengecekan elemen pemanas dan anoda.", 200000, 1, img("photo-1585704032915-c3400ca199e7")],
    ["servis-ac-pangkal-pinang", "perbaikan-rumah", "hendri.bangka@email.com", "Servis AC wilayah Pangkal Pinang: cuci, tambah freon, perbaikan bocor. Garansi 1 bulan.", 175000, 1, img("photo-1759772238012-9d5ad59ae637")],
    ["servis-elektronik-muntok", "perbaikan-rumah", "muntok.teknik@email.com", "Servis elektronik Muntok–Bangka Barat: AC, kulkas, mesin cuci. Sparepart standar tersedia, bisa panggilan.", 160000, 2, img("photo-1626806787461-102c1bfaaea1")],
    ["servis-ac-koba-bangka-tengah", "perbaikan-rumah", "koba.servis@email.com", "Cuci AC & servis kulkas area Koba, Kabupaten Bangka Tengah: cepat, bersih, bergaransi.", 140000, 1, img("photo-1584568694244-14fbdf83bd30")],
    // Kebersihan — Sungailiat, Pangkal Pinang, Tanjung Pandan, Manggar
    ["bersih-rumah-reguler-sungailiat", "kebersihan", "siti.rahayu@email.com", "Pembersihan menyeluruh di Sungailiat: menyapu, mengepel, kamar mandi, dapur, dan kaca. Alat dan cairan pembersih disediakan vendor.", 50000, 1, img("photo-1581578731548-c64695cc6952")],
    ["deep-clean-pasca-renovasi-sungailiat", "kebersihan", "siti.rahayu@email.com", "Pembersihan mendalam pasca renovasi di Sungailiat: debu semen, cat, dan keramik. Tim 2 orang dengan peralatan profesional.", 75000, 2, img("photo-1527515637462-cff94eecc1ac")],
    ["bersih-sofa-karpet-steam-sungailiat", "kebersihan", "rina.marlina@email.com", "Cuci sofa dan karpet metode steam di Kabupaten Bangka: hilangkan noda, debu, dan bau tidak sedap. Per kursi atau per meter persegi.", 90000, 1, img("photo-1563453392212-326f5e854473")],
    ["jasa-bersih-kos-kontrakan-bangka", "kebersihan", "bangka.jaya@email.com", "Paket kebersihan kos & kontrakan se-Kabupaten Bangka: 2x seminggu, termasuk cuci sprei dan mengepel lantai. Kontrak minimal 1 bulan.", 3500000, 1, img("photo-1615875605825-5eb9bb5d52ac")],
    ["pembersihan-ducting-ac-pangkal-pinang", "kebersihan", "hendri.bangka@email.com", "Pembersihan saluran AC ducting untuk rumah dan kantor di Pangkal Pinang. Udara lebih bersih, AC lebih efisien.", 450000, 1, img("photo-1711696488222-3a5af2a3dd72")],
    ["bersih-villa-homestay-belitung", "kebersihan", "lina.natuna@email.com", "Daily cleaning villa & homestay Tanjung Pandan: harian, mingguan, deep clean. Tim ramah dan teliti.", 85000, 1, img("photo-1563453392212-326f5e854473")],
    ["bersih-kantor-ruko-tanjung-pandan", "kebersihan", "belitung.prime@email.com", "Kebersihan kantor & ruko Tanjung Pandan: harian atau mingguan, dikerjakan di luar jam kerja.", 320000, 1, img("photo-1581578731548-c64695cc6952")],
    ["bersih-pasca-banjir-belitung-timur", "kebersihan", "gantung.servis@email.com", "Bersih-bersih pasca banjir di Manggar & Belitung Timur: lumpur, sanitasi, dan pengeringan ruangan.", 240000, 1, img("photo-1527515637462-cff94eecc1ac")],
    // Listrik — Muntok, Koba, Toboali, Tanjung Pandan, Manggar
    ["instalasi-listrik-rumah-muntok", "listrik", "babel.listrik@email.com", "Pemasangan instalasi listrik standar SNI di Muntok: titik lampu, stop kontak, dan panel MCB. Termasuk gambar jalur dan konsultasi penempatan.", 25000000, 5, img("photo-1621905251189-08b45d6a269e")],
    ["perbaikan-listrik-konslet-muntok", "listrik", "babel.listrik@email.com", "Pencarian gangguan listrik, perbaikan korsleting, dan penggantian komponen rusak di Muntok & Kabupaten Bangka Barat. Ditarget selesai hari yang sama.", 200000, 1, img("photo-1621905252507-b35492cc74b4")],
    ["pasang-lampu-saklar-muntok", "listrik", "agus.pratama@email.com", "Pemasangan titik lampu, saklar, dan stop kontak baru di Muntok. Material bisa disediakan atau dibawa sendiri oleh klien.", 100000, 1, img("photo-1581858726788-75bc0f6a952d")],
    ["perawatan-panel-mcb-muntok", "listrik", "muntok.teknik@email.com", "Pengecekan panel listrik, pengencangan terminal, dan penggantian MCB yang sudah jelek di Muntok. Penting untuk keamanan.", 150000, 1, img("photo-1509391366360-2e959784a276")],
    ["pemasangan-lampu-led-downlight-koba", "listrik", "koba.servis@email.com", "Pasang downlight LED recessed 5-12 watt di Koba, Bangka Tengah. Termasuk lubang dan wiring. Per titik.", 85000, 1, img("photo-1600585152220-90363fe7e115")],
    ["listrik-toboali-24-jam", "listrik", "toboali.pro@email.com", "Emergency listrik Toboali 24 jam: konslet, MCB trip, dan tambah daya. Panggilan malam tetap dilayani.", 200000, 1, img("photo-1621905252507-b35492cc74b4")],
    ["instalasi-listrik-tanjung-pandan", "listrik", "belitung.prime@email.com", "Instalasi & perbaikan listrik Tanjung Pandan, Kabupaten Belitung. Standar SNI, bergaransi.", 180000, 2, img("photo-1621905251189-08b45d6a269e")],
    ["penambahan-daya-manggar", "listrik", "manggar.teknik@email.com", "Penambahan daya & penggantian MCB di Manggar, Belitung Timur: survei, material standar, dan uji beban.", 425000, 2, img("photo-1509391366360-2e959784a276")],
    // Pengecatan — Koba, Sungailiat, Tanjung Pandan, Manggar
    ["cat-tembok-interior-koba", "pengecatan", "tengah.cat@email.com", "Pengecatan tembok interior 2 lapis dengan cat dinding premium di Koba, Kabupaten Bangka Tengah. Termasuk plamir dan finishing rapi.", 25000, 3, img("photo-1615873968403-89e068629265")],
    ["cat-tembok-eksterior-koba", "pengecatan", "tengah.cat@email.com", "Pengecatan eksterior tahan cuaca 2 lapis di Kabupaten Bangka Tengah. Termasuk persiapan permukaan, primer, dan pembersihan area kerja.", 30000, 4, img("photo-1560184897-ae75f418493e")],
    ["cat-ulangan-kusen-pagar-besi-koba", "pengecatan", "tengah.cat@email.com", "Pengamplasan, pelapisan anti karat, dan cat finishing untuk kusen dan pagar besi di Koba. Hasil halus dan tahan lama.", 45000, 2, img("photo-1562259949-e8e7689d7828")],
    ["cat-rumah-sungailiat", "pengecatan", "rina.marlina@email.com", "Pengecatan rumah Sungailiat: interior & eksterior, 2 lapis, cat premium.", 28000, 3, img("photo-1615873968403-89e068629265")],
    ["cat-dekoratif-tanjung-pandan", "pengecatan", "belitung.prime@email.com", "Cat dekoratif Tanjung Pandan: motif, coating, dan sentuhan akhir interior untuk rumah maupun penginapan.", 35000, 3, img("photo-1616464916356-3a777b2b60b1")],
    ["cat-rumah-manggar", "pengecatan", "timur.cat@email.com", "Pengecatan rumah area Manggar & Belitung Timur: persiapan permukaan, primer, dan cat finishing 2 lapis.", 30000, 3, img("photo-1562259949-e8e7689d7828")],
    ["waterproofing-dinding-sungailiat", "pengecatan", "bangka.jaya@email.com", "Pelapisan anti bocor dinding & dak beton di Sungailiat, Kabupaten Bangka. Garansi 6 bulan.", 65000, 2, img("photo-1560184897-ae75f418493e")],
    // Pindahan — Toboali, Tanjung Pandan, Manggar
    ["pindah-rumah-1-2-kamar-toboali", "pindahan", "dewi.anggraini@email.com", "Pindah rumah skala kecil di Toboali: packing, angkut, bongkar, dan susun ulang. Termasuk truk dan 2 tenaga kerja.", 900000, 1, img("photo-1714647211902-bb711d643a17")],
    ["pindah-kantor-toboali", "pindahan", "dewi.anggraini@email.com", "Pindah kantor lengkap dengan packing khusus meja, komputer, dan arsip di Toboali. Tim 4 orang profesional.", 2500000, 2, img("photo-1585129777188-94600bc7b4b3")],
    ["jasa-packing-saja-toboali", "pindahan", "selatan.pindah@email.com", "Packing barang dengan bubble wrap dan kardus berkualitas di Toboali. Siap angkut, per jam atau per barang.", 75000, 1, img("photo-1611145367651-6303b46e4040")],
    ["penyimpanan-barang-toboali", "pindahan", "selatan.pindah@email.com", "Penyimpanan barang sementara di gudang aman Toboali. Per bulan per meter kubik, termasuk asuransi.", 150000, 1, img("photo-1600518464441-9154a4dea21b")],
    ["pindahan-lokal-tanjung-pandan", "pindahan", "pindah.belitung@email.com", "Pindahan lokal Tanjung Pandan & Kabupaten Belitung: packing, angkut, bongkar. Truk + 2 crew.", 1100000, 1, img("photo-1714647211902-bb711d643a17")],
    ["pindahan-antar-pulau-bangka-belitung", "pindahan", "pindah.belitung@email.com", "Pindahan antar pulau Bangka–Belitung: packing khusus, jadwal feri, dan pengawalan barang sampai tujuan.", 3200000, 3, img("photo-1585129777188-94600bc7b4b3")],
    ["pindahan-manggar-belitung-timur", "pindahan", "gantung.servis@email.com", "Pindahan area Manggar & Belitung Timur: dalam kota maupun antar kabupaten. Packing aman.", 1250000, 2, img("photo-1600518464441-9154a4dea21b")],
    // Tukang — Koba, Toboali, Pangkal Pinang, Manggar
    ["renovasi-kamar-mandi-koba", "tukang", "yoga.permana@email.com", "Renovasi kamar mandi di Koba: keramik baru, closet, kran, dan sanitair. Termasuk pembongkaran yang lama.", 35000000, 7, img("photo-1595515106969-1ce29566ff1c")],
    ["pasang-keramik-lantai-koba", "tukang", "yoga.permana@email.com", "Pemasangan keramik lantai dengan nat rapi di Koba. Termasuk persiapan acian dasar dan pengeringan.", 60000, 3, img("photo-1504148455328-c376907d081c")],
    ["perbaikan-atap-bocor-toboali", "tukang", "toboali.pro@email.com", "Lokalisir kebocoran, ganti genteng atau nok yang rusak, dan aplikasi waterproofing di Toboali & Kabupaten Bangka Selatan. Garansi 6 bulan.", 300000, 1, img("photo-1541888946425-d81bb19240f5")],
    ["plafon-gypsum-pangkal-pinang", "tukang", "budi.santoso@email.com", "Pemasangan plafon gypsum rangka hollow galvanis di Pangkal Pinang. Termasuk finishing nat dan dempul halus. Rapih dan kuat.", 85000, 4, img("photo-1581092160562-40aa08e78837")],
    ["pemasangan-dinding-batako-manggar", "tukang", "manggar.teknik@email.com", "Pemasangan dinding batako untuk perluasan atau pembatas ruangan di Manggar. Termasuk adukan dan plesteran dasar.", 55000, 3, img("photo-1504307651254-35680f356dfd")],
    ["renovasi-ringan-manggar", "tukang", "gantung.servis@email.com", "Renovasi ringan Manggar–Belitung Timur: plafon, keramik, dan cat. Survei lokasi gratis.", 75000, 4, img("photo-1595515106969-1ce29566ff1c")],
    // DRAFT & ARCHIVED samples
    ["jasa-bangun-pagar-tembok", "tukang", "budi.santoso@email.com", "Pembangunan pagar tembok dengan pondasi dan finishing cat. Min. 3 meter lari. Free konsultasi desain.", 65000, 7, img("photo-1530124566582-a618bc2615dc")],
    ["cuci-ac-rutin-paket-4-unit", "perbaikan-rumah", "budi.santoso@email.com", "Paket cuci 4 unit AC hemat: cuci indoor dan outdoor, cek freon, dan pembersihan filter. Pesan lebih dulu.", 450000, 2, img("photo-1759772238012-9d5ad59ae637")],
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
  // (mis. "pindahan-antar-pulau-bangka-belitung") sehingga tidak bisa dipakai
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
    "perbaikan-rumah": [
      img("photo-1753826477307-82c71f3d9537"),
      img("photo-1754665099555-dea88285e4ec"),
      img("photo-1626806787461-102c1bfaaea1"),
      img("photo-1584568694244-14fbdf83bd30"),
    ],
    kebersihan: [
      img("photo-1581578731548-c64695cc6952"),
      img("photo-1527515637462-cff94eecc1ac"),
      img("photo-1563453392212-326f5e854473"),
      img("photo-1615875605825-5eb9bb5d52ac"),
    ],
    listrik: [
      img("photo-1621905251189-08b45d6a269e"),
      img("photo-1621905252507-b35492cc74b4"),
      img("photo-1581858726788-75bc0f6a952d"),
      img("photo-1509391366360-2e959784a276"),
    ],
    pengecatan: [
      img("photo-1615873968403-89e068629265"),
      img("photo-1560184897-ae75f418493e"),
      img("photo-1562259949-e8e7689d7828"),
      img("photo-1616464916356-3a777b2b60b1"),
    ],
    pindahan: [
      img("photo-1714647211902-bb711d643a17"),
      img("photo-1585129777188-94600bc7b4b3"),
      img("photo-1611145367651-6303b46e4040"),
      img("photo-1600518464441-9154a4dea21b"),
    ],
    tukang: [
      img("photo-1595515106969-1ce29566ff1c"),
      img("photo-1504148455328-c376907d081c"),
      img("photo-1541888946425-d81bb19240f5"),
      img("photo-1581092160562-40aa08e78837"),
    ],
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
        status: slug === "jasa-bangun-pagar-tembok" ? "ARCHIVED" : slug === "cuci-ac-rutin-paket-4-unit" ? "DRAFT" : "ACTIVE",
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
    "Hasilnya rapi dan sesuai janji. Sangat direkomendasikan untuk yang butuh tukang cepat dan teliti.",
    "Cepat, bersih, dan harganya wajar. Pasti pakai lagi untuk service berkala.",
    "Komunikasi dari awal sampai selesai sangat jelas. Datang tepat waktu seperti yang dijanjikan.",
    "Datang tepat waktu, kerja profesional, hasil memuaskan. Kamar mandi baru kinclong!",
    "Sudah langganan dua kali, kualitasnya konsisten. Harga juga tidak kemahalan.",
    "Penjelasan detail sebelum kerja dimulai, tidak ada biaya tersembunyi. Profesional.",
    "Hasil melebihi ekspektasi, harganya juga masuk akal. AC sekarang adem banget.",
    "Tukangnya ramah dan sabar menjawab pertanyaan saya. Sangat puas dengan hasilnya.",
    "Pengecatan rumah selesai lebih cepat dari estimasi. Hasil cat rapi dan tidak ada cipratan di lantai.",
    "Proses pindah rumah lancar, barang aman sampai tujuan. Timnya kooperatif banget.",
    "Servis AC sekarang dingin kembali seperti baru. Charges wajar, tidak overpriced.",
    "Bersih banget, bahkan bagian yang saya tidak minta dibersihkan juga dirapikan.",
    "Sudah tiga kali pakai untuk perawatan AC. Konsisten baik pelayanannya.",
    "Respon cepat dari chat sampai datang. Masalah listrik di rumah solved dalam 2 jam.",
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