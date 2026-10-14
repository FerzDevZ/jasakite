#!/usr/bin/env python3
"""
Migrasi data dari SQLite (prisma/dev.db) ke PostgreSQL.
=============================================================================
Script ini membaca data dari SQLite dan meng-INSERT ke PostgreSQL secara
berurutan sesuai dependency graph foreign key.

Tabel yang dimigrasi (urutan penting):
  1. Category        (no FK dependency)
  2. User            (no FK dependency)
  3. Service         (depends on User, Category)
  4. SavedService    (depends on User, Service)
  5. Order           (depends on User, Service)
  6. Message         (depends on Order, User)
  7. Review          (depends on Order, User)

Prasyarat:
  - PostgreSQL server sudah berjalan
  - Database sudah dibuat (schema.sql sudah di-run)
  - Python packages: pip install psycopg2-binary

Penggunaan:
  # Pastikan DATABASE_URL sudah di-set
  export DATABASE_URL="postgresql://user:pass@localhost:5432/jasakite"

  python3 prisma/postgresql/migrate_data.py

  # Mode dry-run (tidak menulis, hanya verifikasi)
  python3 prisma/postgresql/migrate_data.py --dry-run

  # Sumber SQLite custom
  python3 prisma/postgresql/migrate_data.py --sqlite prisma/dev.db
"""
import argparse
import os
import sqlite3
import sys
from datetime import datetime

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("ERROR: psycopg2-binary tidak terinstall.")
    print("  Install dengan: pip install psycopg2-binary")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Konfigurasi
# ---------------------------------------------------------------------------
DEFAULT_SQLITE_PATH = "prisma/dev.db"
DEFAULT_PG_URL = os.environ.get("DATABASE_URL", "")

# Urutan migrasi berdasarkan dependency graph
TABLE_ORDER = [
    "Category",
    "User",
    "Service",
    "SavedService",
    "Order",
    "Message",
    "Review",
]

# Mapping kolom per tabel (SQLite column -> PostgreSQL column)
# Semua kolom identik, tapi dipertahankan mapping untuk fleksibilitas
TABLE_COLUMNS = {
    "Category":      ["id", "name", "slug", "icon", "description"],
    "User":          ["id", "name", "email", "passwordHash", "phone", "role",
                      "bio", "avatarUrl", "location", "city", "createdAt",
                      "updatedAt"],
    "Service":       ["id", "providerId", "categoryId", "title", "slug",
                      "description", "price", "deliveryTimeDays", "ratingAvg",
                      "totalReviews", "status", "createdAt"],
    "SavedService":  ["id", "userId", "serviceId", "createdAt"],
    "Order":         ["id", "customerId", "serviceId", "totalPrice", "status",
                      "paymentMethod", "orderNotes", "deadline", "createdAt",
                      "completedAt"],
    "Message":       ["id", "orderId", "senderId", "content", "createdAt"],
    "Review":        ["id", "orderId", "reviewerId", "rating", "comment", "createdAt"],
}


def parse_sqlite_datetime(val):
    """Konversi format datetime SQLite ke ISO format untuk PostgreSQL."""
    if val is None:
        return None
    if isinstance(val, str):
        # SQLite format: "2025-01-15 10:30:00" atau "2025-01-15T10:30:00"
        try:
            return val.replace(" ", "T") if "T" not in val else val
        except Exception:
            return val
    return val


def connect_sqlite(path):
    """Buka koneksi ke SQLite."""
    if not os.path.exists(path):
        print(f"ERROR: File SQLite tidak ditemukan: {path}")
        sys.exit(1)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def connect_postgres(pg_url):
    """Buka koneksi ke PostgreSQL."""
    if not pg_url:
        print("ERROR: DATABASE_URL tidak di-set.")
        print("  Contoh: export DATABASE_URL=\"postgresql://user:pass@localhost:5432/jasakite\"")
        sys.exit(1)
    try:
        conn = psycopg2.connect(pg_url)
        conn.autocommit = False
        return conn
    except psycopg2.OperationalError as e:
        print(f"ERROR: Tidak bisa connect ke PostgreSQL: {e}")
        sys.exit(1)


def get_row_count(sqlite_conn, table):
    """Hitung jumlah baris di tabel SQLite."""
    cur = sqlite_conn.cursor()
    cur.execute(f'SELECT COUNT(*) FROM "{table}"')
    return cur.fetchone()[0]


def fetch_all_rows(sqlite_conn, table, columns):
    """Ambil semua baris dari tabel SQLite."""
    cur = sqlite_conn.cursor()
    col_list = ", ".join(f'"{c}"' for c in columns)
    cur.execute(f'SELECT {col_list} FROM "{table}"')
    rows = cur.fetchall()
    # Konversi ke list of dict
    return [dict(zip(columns, row)) for row in rows]


def insert_rows(pg_conn, table, columns, rows, dry_run=False):
    """Insert batch rows ke PostgreSQL."""
    if not rows:
        print(f"  {table}: 0 baris (skip)")
        return 0

    if dry_run:
        print(f"  [DRY-RUN] {table}: {len(rows)} baris akan di-insert")
        return len(rows)

    cur = pg_conn.cursor()
    col_list = ", ".join(f'"{c}"' for c in columns)
    placeholders = ", ".join(["%s"] * len(columns))
    sql = f'INSERT INTO "{table}" ({col_list}) VALUES ({placeholders})'

    # Batch insert
    values = []
    for row in rows:
        row_values = []
        for col in columns:
            val = row[col]
            # Konversi datetime string
            if col in ("createdAt", "updatedAt", "deadline", "completedAt"):
                val = parse_sqlite_datetime(val)
            row_values.append(val)
        values.append(tuple(row_values))

    try:
        psycopg2.extras.execute_values(cur, sql, values)
        pg_conn.commit()
        print(f"  {table}: {len(rows)} baris ✓")
        return len(rows)
    except Exception as e:
        pg_conn.rollback()
        print(f"  ERROR inserting {table}: {e}")
        raise


def verify_migration(sqlite_conn, pg_conn):
    """Bandingkan jumlah baris SQLite vs PostgreSQL."""
    print("\n=== VERIFIKASI ===")
    all_match = True
    cur = pg_conn.cursor()
    for table in TABLE_ORDER:
        sqlite_count = get_row_count(sqlite_conn, table)
        cur.execute(f'SELECT COUNT(*) FROM "{table}"')
        pg_count = cur.fetchone()[0]
        status = "✓" if sqlite_count == pg_count else "✗ MISMATCH"
        if sqlite_count != pg_count:
            all_match = False
        print(f"  {table:20s} SQLite={sqlite_count:6d}  PostgreSQL={pg_count:6d}  {status}")
    return all_match


def main():
    parser = argparse.ArgumentParser(description="Migrasi SQLite → PostgreSQL")
    parser.add_argument("--sqlite", default=DEFAULT_SQLITE_PATH,
                        help=f"Path ke file SQLite (default: {DEFAULT_SQLITE_PATH})")
    parser.add_argument("--pg-url", default=DEFAULT_PG_URL,
                        help="PostgreSQL connection URL (default: $DATABASE_URL)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Tidak menulis data, hanya verifikasi koneksi & count")
    args = parser.parse_args()

    pg_url = args.pg_url or os.environ.get("DATABASE_URL", "")
    if not pg_url and not args.dry_run:
        print("ERROR: --pg-url atau DATABASE_URL wajib di-set untuk migrasi nyata.")
        sys.exit(1)

    print("=" * 70)
    print("  MIGRASI SQLITE → POSTGRESQL")
    print("=" * 70)
    print(f"  Sumber  SQLite  : {args.sqlite}")
    print(f"  Tujuan  Postgres: {pg_url or '(dry-run, tidak konek)'}")
    print(f"  Mode           : {'DRY-RUN' if args.dry_run else 'MIGRASI'}")
    print("=" * 70)

    # Connect SQLite
    sqlite_conn = connect_sqlite(args.sqlite)
    print(f"\n✓ Terhubung ke SQLite: {args.sqlite}")

    # Show source counts
    print("\n--- Sumber data (SQLite) ---")
    for table in TABLE_ORDER:
        count = get_row_count(sqlite_conn, table)
        print(f"  {table:20s}: {count:6d} baris")

    if args.dry_run:
        print("\n[DRY-RUN] Tidak ada data yang ditransfer.")
        print("Jalankan tanpa --dry-run untuk migrasi sebenarnya.")
        sqlite_conn.close()
        return

    # Connect PostgreSQL
    pg_conn = connect_postgres(pg_url)
    print(f"\n✓ Terhubung ke PostgreSQL")

    # Truncate existing data (safe: urutan terbalik untuk hindari FK violation)
    print("\n--- Membersihkan data lama di PostgreSQL ---")
    cur = pg_conn.cursor()
    for table in reversed(TABLE_ORDER):
        cur.execute(f'TRUNCATE TABLE "{table}" RESTART IDENTITY CASCADE')
    pg_conn.commit()
    print("  Semua tabel dibersihkan ✓")

    # Migrasi data
    print("\n--- Migrasi data ---")
    total_migrated = 0
    for table in TABLE_ORDER:
        columns = TABLE_COLUMNS[table]
        rows = fetch_all_rows(sqlite_conn, table, columns)
        count = insert_rows(pg_conn, table, columns, rows)
        total_migrated += count

    print(f"\n{'=' * 70}")
    print(f"  TOTAL BARIS DIPINDAHKAN: {total_migrated}")
    print(f"{'=' * 70}")

    # Verifikasi
    all_match = verify_migration(sqlite_conn, pg_conn)

    # Sync sequence (penting setelah insert dengan ID eksplisit)
    print("\n--- Sinkronisasi SERIAL sequences ---")
    for table in TABLE_COLUMNS:
        cur.execute(f"SELECT setval(pg_get_serial_sequence('\"{table}\"', 'id'), "
                    f"COALESCE(MAX(id), 0) + 1, false) FROM \"{table}\"")
    pg_conn.commit()
    print("  Semua sequence di-sync ✓")

    # Close
    sqlite_conn.close()
    pg_conn.close()

    if all_match:
        print("\n✅ Migrasi berhasil! Semua baris cocok.")
    else:
        print("\n⚠️  Migrasi selesai tetapi ada mismatch. Periksa log di atas.")
        sys.exit(1)


if __name__ == "__main__":
    main()
