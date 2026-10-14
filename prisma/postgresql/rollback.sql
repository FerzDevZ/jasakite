-- ============================================================================
-- Rollback: drop semua tabel PostgreSQL (undo schema.sql)
-- ============================================================================
-- PERHATIAN: Ini akan menghapus SEMUA data. Jalankan hanya jika ingin
-- membatalkan migrasi dan kembali ke SQLite.
--
-- psql "$DATABASE_URL" -f prisma/migrations/postgresql/rollback.sql
-- ============================================================================

DROP TABLE IF EXISTS "Review"      CASCADE;
DROP TABLE IF EXISTS "Message"     CASCADE;
DROP TABLE IF EXISTS "Order"       CASCADE;
DROP TABLE IF EXISTS "SavedService" CASCADE;
DROP TABLE IF EXISTS "Service"     CASCADE;
DROP TABLE IF EXISTS "Category"    CASCADE;
DROP TABLE IF EXISTS "User"        CASCADE;

-- Drop trigger function (jika ada dari schema_enums.sql)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop enums (jika ada dari schema_enums.sql)
DROP TYPE IF EXISTS user_role_enum      CASCADE;
DROP TYPE IF EXISTS service_status_enum CASCADE;
DROP TYPE IF EXISTS order_status_enum   CASCADE;
DROP TYPE IF EXISTS payment_method_enum CASCADE;
