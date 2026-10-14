-- Kolom kota yang sudah dinormalkan, terpisah dari `location` (alamat lengkap).
--
-- Alasan: filter katalog memakai `location contains <query>`, sehingga kueri
-- "Jl" atau bahkan satu huruf "a" mencocokkan potongan alamat dan
-- mengembalikan SELURUH katalog. `city` menyimpan hanya nama kota, lowercase,
-- agar pencocokan tidak bergantung pada `mode: "insensitive"` yang tidak
-- didukung Prisma di SQLite.
--
-- Backfill dijalankan oleh prisma/backfill-city.js (lihat npm run db:backfill-city)
-- karena parsing alamat butuh logika yang sama dengan lib/location.ts.
ALTER TABLE "User" ADD COLUMN "city" TEXT;

-- CreateIndex
CREATE INDEX "User_role_city_idx" ON "User"("role", "city");
