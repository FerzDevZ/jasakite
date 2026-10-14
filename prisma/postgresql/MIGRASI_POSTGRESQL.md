# Migrasi SQLite → PostgreSQL — Dokumentasi Lengkap

> **Proyek**: JASAKITE (Next.js + Prisma)
> **Sumber**: SQLite (`prisma/dev.db`) — 7 tabel, 290 baris total
> **Tujuan**: PostgreSQL 14+

---

## Daftar Isi

1. [Ringkasan](#1-ringkasan)
2. [Pemetaan Tipe Data](#2-pemetaan-tipe-data)
3. [Struktur File Migrasi](#3-struktur-file-migrasi)
4. [Prasyarat](#4-prasyarat)
5. [Langkah Migrasi](#5-langkah-migrasi)
6. [Verifikasi Pasca-Migrasi](#6-verifikasi-pasca-migrasi)
7. [Perbedaan SQLite vs PostgreSQL](#7-perbedaan-sqlite-vs-postgresql)
8. [Rollback](#8-rollback)
9. [Troubleshooting](#9-troubleshooting)
10. [Checklist Produksi](#10-checklist-produksi)

---

## 1. Ringkasan

Database SQLite saat ini berisi 7 tabel dengan total ~290 baris data:

| Tabel        | Baris | Dependensi FK               |
|--------------|------:|-----------------------------|
| Category     |     6 | —                           |
| User         |    30 | —                           |
| Service      |    30 | User, Category               |
| SavedService |     0 | User, Service                |
| Order        |   137 | User, Service                |
| Message      |     0 | Order, User                  |
| Review       |    87 | Order, User                  |

Struktur Prisma (`prisma/schema.prisma`) tidak perlu diubah pada level model — hanya `datasource` yang beralih dari `sqlite` ke `postgresql`. Prisma secara otomatis menerjemahkan tipe data dengan benar.

---

## 2. Pemetaan Tipe Data

| Prisma Type      | SQLite Storage | PostgreSQL Type       | Catatan                         |
|------------------|----------------|-----------------------|---------------------------------|
| `Int @id @default(autoincrement())` | INTEGER | SERIAL (INTEGER + sequence) | Auto-increment via sequence |
| `String`         | TEXT           | TEXT                  | Identik                         |
| `String @unique` | TEXT + UNIQUE  | TEXT + UNIQUE          | Identik                         |
| `Float`          | REAL / DOUBLE  | DOUBLE PRECISION      | Identik presisi                 |
| `DateTime`       | TEXT (ISO8601) | TIMESTAMP(3)         | Presisi milidetik               |
| `DateTime @default(now())` | TEXT | TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP | —    |
| `DateTime @updatedAt` | TEXT    | TIMESTAMP(3) + trigger | Perlu trigger untuk auto-update |
| `String?`        | TEXT (nullable)| TEXT (nullable)       | Identik                         |
| `@@index([a, b])`| INDEX          | CREATE INDEX          | Identik                         |
| `@@unique([a, b])`| UNIQUE constraint | UNIQUE constraint | Identik                     |

### Catatan penting:
- **Boolean**: Tidak ada di schema ini, tapi jika ditambahkan → SQLite: INTEGER (0/1), PostgreSQL: BOOLEAN
- **JSON**: Jika ditambahkan → SQLite: TEXT, PostgreSQL: JSONB (lebih powerful)
- **Decimal/Bigint**: Untuk harga, pertimbangkan migrasi `Float` → `Decimal` di Prisma untuk presisi finansial

---

## 3. Struktur File Migrasi

```
prisma/postgresql/
├── MIGRASI_POSTGRESQL.md       ← Dokumen ini (panduan lengkap)
├── schema.sql                  ← Schema PostgreSQL (TEXT-based, tanpa ENUM)
├── schema_enums.sql            ← Schema PostgreSQL dengan ENUM + trigger
├── schema_diff.txt             ← Diff untuk prisma/schema.prisma
├── migrate_data.py             ← Script migrasi data (Python)
├── migrate_data.js             ← Script migrasi data (Node.js/Prisma)
├── verify.sql                  ← Query verifikasi integritas
├── rollback.sql                ← Rollback: drop semua tabel
└── .env.example                ← Template DATABASE_URL
```

---

## 4. Prasyarat

### 4.1 PostgreSQL Server

```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib

# macOS (Homebrew)
brew install postgresql@16
brew services start postgresql@16

# Docker (alternatif)
docker run --name jasakite-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=jasakite \
  -p 5432:5432 \
  -d postgres:16
```

### 4.2 Buat Database & User

```bash
# Masuk sebagai postgres superuser
sudo -u postgres psql
```

```sql
-- Buat database
CREATE DATABASE jasakite;

-- (Opsional) Buat user khusus
CREATE USER jasakite_user WITH PASSWORD 'p4ssw0rd';
GRANT ALL PRIVILEGES ON DATABASE jasakite TO jasakite_user;

-- Set di schema-level (connect ke database dulu)
\c jasakite
GRANT ALL ON SCHEMA public TO jasakite_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO jasakite_user;
```

### 4.3 Install Dependencies

```bash
# Untuk script Python
pip install psycopg2-binary

# Untuk script Node.js (opsional, alternative)
npm install better-sqlite3
```

### 4.4 Backup SQLite (PENTING!)

```bash
# Salin database SQLite sebagai backup
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d)

# Atau export ke SQL dump
python3 -c "
import sqlite3
conn = sqlite3.connect('prisma/dev.db')
with open('prisma/dev_dump.sql', 'w') as f:
    for line in conn.iterdump():
        f.write(line + '\n')
"
```

---

## 5. Langkah Migrasi

### Langkah 1: Buat Schema PostgreSQL

Pilih salah satu dari dua schema:

```bash
# Opsi A: Schema standar (TEXT, tanpa ENUM) — RECOMMENDED
psql "$DATABASE_URL" -f prisma/postgresql/schema.sql

# Opsi B: Schema dengan ENUM + trigger (stricter constraints)
psql "$DATABASE_URL" -f prisma/postgresql/schema_enums.sql
```

### Langkah 2: Update `prisma/schema.prisma`

Ubah `datasource` block:

```prisma
// SEBELUM
datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

// SESUDAH
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

> **Catatan**: Tidak ada perubahan pada model. Semua `model User`, `model Service`, dll. tetap identik.

### Langkah 3: Set `DATABASE_URL`

```bash
# Buat/update .env di root project
cp prisma/postgresql/.env.example .env
# Edit .env sesuai kredensial Anda
```

### Langkah 4: Regenerate Prisma Client

```bash
# Generate client untuk PostgreSQL
npx prisma generate

# (Opsional) Buat migration history di PostgreSQL
npx prisma migrate dev --name init_postgresql
```

> **Peringatan**: `prisma migrate dev` akan membuat tabel `_prisma_migrations` di PostgreSQL. Jika Anda sudah menjalankan `schema.sql` manual, gunakan `prisma migrate resolve` untuk menandai migration sebagai applied.

### Langkah 5: Migrasi Data

Pilih salah satu script:

```bash
# Opsi A: Python script (tanpa dependency Prisma)
python3 prisma/postgresql/migrate_data.py

# Opsi B: Node.js script (menggunakan PrismaClient)
node prisma/postgresql/migrate_data.js

# Dry-run untuk verifikasi koneksi tanpa menulis
python3 prisma/postgresql/migrate_data.py --dry-run
```

Output expected:
```
======================================================================
  MIGRASI SQLITE → POSTGRESQL
======================================================================
  Sumber  SQLite  : prisma/dev.db
  Tujuan  Postgres: postgresql://postgres:postgres@localhost:5432/jasakite
======================================================================

--- Migrasi data ---
  Category: 6 baris ✓
  User: 30 baris ✓
  Service: 30 baris ✓
  SavedService: 0 baris (skip)
  Order: 137 baris ✓
  Message: 0 baris (skip)
  Review: 87 baris ✓

======================================================================
  TOTAL BARIS DIPINDAHKAN: 290
======================================================================

✅ Migrasi berhasil! Semua baris cocok.
```

### Langkah 6: (Alternatif) Reseed Fresh

Jika tidak ingin migrasi data lama, jalankan seed di PostgreSQL:

```bash
# Pastikan DATABASE_URL menunjuk ke PostgreSQL
node prisma/seed.js
```

---

## 6. Verifikasi Pasca-Migrasi

### 6.1 Query Verifikasi Otomatis

```bash
psql "$DATABASE_URL" -f prisma/postgresql/verify.sql
```

Script ini memeriksa:
1. **Jumlah baris** per tabel (harus cocok dengan SQLite)
2. **Orphan foreign keys** (harus 0)
3. **Duplikat unique constraint** (harus kosong)
4. **NULL pada kolom NOT NULL** (harus 0)
5. **Sequence status** (harus > MAX(id))

### 6.2 Verifikasi Manual

```bash
# Cek koneksi dari aplikasi
node -e "
const { prisma } = require('./lib/prisma');
prisma.user.count().then(c => {
  console.log('User count:', c);
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
"

# Cek tabel ada
psql "$DATABASE_URL" -c "\dt"

# Cek struktur tabel
psql "$DATABASE_URL" -c "\d \"User\""
psql "$DATABASE_URL" -c "\d \"Service\""
```

### 6.3 Test Aplikasi

```bash
# Jalankan dev server dan test endpoint
npm run dev

# Test di browser:
# - Login dengan akun demo (admin@jasakite.id / password123)
# - Cek halaman /service → data harus muncul
# - Cek detail service → rating & reviews harus muncul
```

---

## 7. Perbedaan SQLite vs PostgreSQL

### 7.1 Behavior Changes

| Aspek                | SQLite                        | PostgreSQL                          |
|----------------------|-------------------------------|-------------------------------------|
| Case sensitivity     | `LIKE` case-insensitive      | `LIKE` case-sensitive, gunakan `ILIKE` |
| Boolean              | INTEGER (0/1)                 | BOOLEAN (true/false)                |
| Auto-increment       | `AUTOINCREMENT`               | `SERIAL` / `GENERATED ALWAYS AS IDENTITY` |
| Transaction isolation | Serializable (default)      | Read Committed (default)            |
| Concurrency          | Single writer                | MVCC (multi-reader + multi-writer)  |
| DateTime storage     | TEXT (ISO8601 string)         | TIMESTAMP (binary)                  |
| Full-text search     | FTS5 extension                | Built-in `tsvector` / `tsquery`     |
| JSON                 | JSON1 extension (TEXT-based)  | JSONB (native, indexable)           |
| Array type           | Tidak ada                     | `INTEGER[]`, `TEXT[]`              |
| `PRAGMA`             | Ya (pragma_table_info, dll.) | Tidak ada                           |
| Vacuum               | `VACUUM`                      | `VACUUM` / `autovacuum`             |

### 7.2 Yang Perlu Diperhatikan di Kode Aplikasi

Periksa kode yang menggunakan query raw SQL atau fitur spesifik SQLite:

```bash
# Cari penggunaan raw SQL di kode
grep -rn "prisma.\$queryRaw\|prisma.\$executeRaw" --include="*.ts" --include="*.tsx" lib/ app/

# Cari penggunaan LIKE (mungkin perlu ILIKE)
grep -rn "LIKE\|like(" --include="*.ts" --include="*.tsx" lib/ app/
```

**File yang menggunakan Prisma query** (tidak perlu diubah):
- `lib/auth.ts` — `prisma.user.findUnique()`
- `app/service/[slug]/page.tsx` — `prisma.service.findUnique()`, `findMany()`
- `prisma/seed.js` — `prisma.user.upsert()`, `prisma.service.create()`, dll.

Semua query di atas menggunakan Prisma Client API yang database-agnostic, sehingga **tidak perlu perubahan kode**.

### 7.3 Query yang Mungkin Berbeda Hasil

```sql
-- SQLite: case-insensitive
SELECT * FROM "User" WHERE name LIKE 'budi%';  -- match: Budi Santoso
-- PostgreSQL: case-sensitive (tidak match!)
SELECT * FROM "User" WHERE name LIKE 'budi%';  -- no match
-- PostgreSQL fix:
SELECT * FROM "User" WHERE name ILIKE 'budi%';  -- match: Budi Santoso
```

---

## 8. Rollback

### 8.1 Kembali ke SQLite

```bash
# 1. Kembalikan schema.prisma ke SQLite
#    Ubah datasource kembali:
#      provider = "sqlite"
#      url      = "file:./dev.db"

# 2. Drop semua tabel PostgreSQL
psql "$DATABASE_URL" -f prisma/postgresql/rollback.sql

# 3. Regenerate Prisma Client
npx prisma generate

# 4. Restore backup SQLite (jika ada)
cp prisma/dev.db.backup.* prisma/dev.db
```

### 8.2 Hapus Migration History

```bash
# Hapus folder migrations PostgreSQL (jika dibuat dengan prisma migrate)
rm -rf prisma/migrations/

# Hapus _prisma_migrations table di PostgreSQL
psql "$DATABASE_URL" -c "DROP TABLE IF EXISTS _prisma_migrations;"
```

---

## 9. Troubleshooting

### Error: `relation "User" does not exist`
**Penyebab**: Schema belum dibuat di PostgreSQL.
**Solusi**: Jalankan `schema.sql` atau `npx prisma migrate dev`.

### Error: `permission denied for table "User"`
**Penyebab**: User PostgreSQL tidak punya hak akses.
**Solusi**:
```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO jasakite_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO jasakite_user;
```

### Error: `duplicate key value violates unique constraint`
**Penyebaban**: Data sudah ada (double insert).
**Solusi**: Jalankan `TRUNCATE ... RESTART IDENTITY CASCADE` sebelum re-migrasi.

### Error: `insert or update on "Service" violates foreign key constraint`
**Penyebab**: Urutan insert salah — Service sebelum User/Category.
**Solusi**: Pastikan script migrasi mengikuti urutan: Category → User → Service → SavedService → Order → Message → Review.

### Error: `setval: sequence "xxx" does not exist`
**Penyebab**: Tabel dibuat manual tanpa SERIAL.
**Solusi**: Pastikan `schema.sql` menggunakan `SERIAL PRIMARY KEY`, bukan `INTEGER PRIMARY KEY`.

### Error: `pg_get_serial_sequence: NULL`
**Penyebab**: Kolom ID bukan SERIAL (mungkin dibuat dengan `INTEGER` saja).
**Solusi**:
```sql
ALTER TABLE "User" ALTER COLUMN id SET DEFAULT nextval('User_id_seq');
CREATE SEQUENCE IF NOT EXISTS User_id_seq OWNED BY "User".id;
```

### Error: `password authentication failed for user`
**Penyebab**: Kredensial salah di `DATABASE_URL`.
**Solusi**: Verifikasi user/password di `pg_hba.conf`.

### Prisma: `Environment variable not found: DATABASE_URL`
**Penyebab**: `.env` tidak di-load atau salah lokasi.
**Solusi**:
```bash
# Pastikan .env ada di root project
cat .env
# Atau set inline
DATABASE_URL="postgresql://..." npx prisma generate
```

---

## 10. Checklist Produksi

Sebelum deploy ke produksi dengan PostgreSQL:

### Pre-deploy
- [ ] `.env` production menggunakan `DATABASE_URL` PostgreSQL (bukan SQLite)
- [ ] `prisma/schema.prisma` provider = `"postgresql"`
- [ ] `npx prisma generate` sudah dijalankan
- [ ] Backup database SQLite tersimpan
- [ ] Migration SQL sudah di-test di staging

### Deploy
- [ ] Buat database PostgreSQL di production server
- [ ] Jalankan `schema.sql` (atau `prisma migrate deploy`)
- [ ] Migrasi data (jika perlu) atau seed fresh
- [ ] Jalankan `verify.sql` — semua check pass

### Post-deploy
- [ ] Test login (admin@jasakite.id)
- [ ] Test halaman service list
- [ ] Test detail service + review
- [ ] Test create order
- [ ] Test message
- [ ] Performance: cek query slow log
- [ ] Set up `pg_dump` cron backup:
  ```bash
  # Crontab: backup harian jam 2 pagi
  0 2 * * * pg_dump "$DATABASE_URL" | gzip > /backups/jasakite_$(date +\%Y\%m\%d).sql.gz
  ```

### Connection Pooling (opsional, untuk serverless)

```yaml
# docker-compose.yml untuk PgBouncer
pgbouncer:
  image: edoburu/pgbouncer:latest
  environment:
    DB_USER: postgres
    DB_PASSWORD: postgres
    DB_HOST: postgres
    DB_NAME: jasakite
  ports:
    - "6432:5432"
```

```bash
# .env untuk serverless (Vercel + Neon)
DATABASE_URL="postgresql://user:pass@host/db?pgbouncer=true&connection_limit=1"
```

---

## Quick Reference — One-liner Commands

```bash
# 1. Buat schema
psql "$DATABASE_URL" -f prisma/postgresql/schema.sql

# 2. Migrasi data
python3 prisma/postgresql/migrate_data.py

# 3. Verifikasi
psql "$DATABASE_URL" -f prisma/postgresql/verify.sql

# 4. Test aplikasi
npm run dev

# Rollback (jika perlu)
psql "$DATABASE_URL" -f prisma/postgresql/rollback.sql
```
