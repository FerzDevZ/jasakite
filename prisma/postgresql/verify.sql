-- ============================================================================
-- Script verifikasi integritas pasca-migrasi
-- ============================================================================
-- Jalankan setelah migrasi untuk memastikan data konsisten.
--
-- psql "$DATABASE_URL" -f prisma/migrations/postgresql/verify.sql
-- ============================================================================

\echo '============================================================'
\echo '  VERIFIKASI INTEGRITAS DATA POSTGRESQL'
\echo '============================================================'

\echo ''
\echo '1. JUMLAH BARIS PER TABEL'
\echo '------------------------------------------------------------'
SELECT 'User'         AS table_name, COUNT(*) AS row_count FROM "User"
UNION ALL
SELECT 'Category',    COUNT(*) FROM "Category"
UNION ALL
SELECT 'Service',     COUNT(*) FROM "Service"
UNION ALL
SELECT 'SavedService', COUNT(*) FROM "SavedService"
UNION ALL
SELECT 'Order',       COUNT(*) FROM "Order"
UNION ALL
SELECT 'Message',     COUNT(*) FROM "Message"
UNION ALL
SELECT 'Review',      COUNT(*) FROM "Review"
ORDER BY table_name;

\echo ''
\echo '2. CEK ORPHAN FOREIGN KEY (harusnya 0)'
\echo '------------------------------------------------------------'

\echo 'Service.providerId → User.id:'
SELECT COUNT(*) AS orphan_count FROM "Service" s
  LEFT JOIN "User" u ON s."providerId" = u."id" WHERE u."id" IS NULL;

\echo 'Service.categoryId → Category.id:'
SELECT COUNT(*) AS orphan_count FROM "Service" s
  LEFT JOIN "Category" c ON s."categoryId" = c."id" WHERE c."id" IS NULL;

\echo 'Order.customerId → User.id:'
SELECT COUNT(*) AS orphan_count FROM "Order" o
  LEFT JOIN "User" u ON o."customerId" = u."id" WHERE u."id" IS NULL;

\echo 'Order.serviceId → Service.id:'
SELECT COUNT(*) AS orphan_count FROM "Order" o
  LEFT JOIN "Service" s ON o."serviceId" = s."id" WHERE s."id" IS NULL;

\echo 'Message.orderId → Order.id:'
SELECT COUNT(*) AS orphan_count FROM "Message" m
  LEFT JOIN "Order" o ON m."orderId" = o."id" WHERE o."id" IS NULL;

\echo 'Review.orderId → Order.id:'
SELECT COUNT(*) AS orphan_count FROM "Review" r
  LEFT JOIN "Order" o ON r."orderId" = o."id" WHERE o."id" IS NULL;

\echo ''
\echo '3. CEK DUPLIKAT UNIQUE CONSTRAINT'
\echo '------------------------------------------------------------'

\echo 'Duplikat email di User:'
SELECT "email", COUNT(*) AS dup_count FROM "User"
  GROUP BY "email" HAVING COUNT(*) > 1;

\echo 'Duplikat slug di Category:'
SELECT "slug", COUNT(*) AS dup_count FROM "Category"
  GROUP BY "slug" HAVING COUNT(*) > 1;

\echo 'Duplikat slug di Service:'
SELECT "slug", COUNT(*) AS dup_count FROM "Service"
  GROUP BY "slug" HAVING COUNT(*) > 1;

\echo ''
\echo '4. CEK NULL PADA KOLOM NOT NULL'
\echo '------------------------------------------------------------'
SELECT 'User.email' AS col, COUNT(*) AS null_count FROM "User" WHERE "email" IS NULL
UNION ALL
SELECT 'Service.title', COUNT(*) FROM "Service" WHERE "title" IS NULL
UNION ALL
SELECT 'Service.price', COUNT(*) FROM "Service" WHERE "price" IS NULL
UNION ALL
SELECT 'Order.status', COUNT(*) FROM "Order" WHERE "status" IS NULL
UNION ALL
SELECT 'Review.rating', COUNT(*) FROM "Review" WHERE "rating" IS NULL
UNION ALL
SELECT 'Message.content', COUNT(*) FROM "Message" WHERE "content" IS NULL;

\echo ''
\echo '5. CEK SEQUENCE (harus > MAX(id))'
\echo '------------------------------------------------------------'
SELECT 'User' AS table_name,
       MAX(id) AS max_id,
       pg_get_serial_sequence('"User"', 'id') AS seq_name,
       last_value AS last_seq_val
FROM "User", pg_sequences WHERE seqtypid IS NOT NULL
LIMIT 1;

\echo ''
\echo '============================================================'
\echo '  Verifikasi selesai. Semua count di atas harus 0/empty.'
\echo '============================================================'
