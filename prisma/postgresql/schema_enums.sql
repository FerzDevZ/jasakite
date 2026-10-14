-- ============================================================================
-- JASAKITE — PostgreSQL Schema (PostGIS-ready variant)
-- ============================================================================
-- Variant schema dengan tipe ENUM aktif untuk data integrity yang lebih ketat.
-- Gunakan ini jika Anda ingin database-level enum constraints.
--
-- PERHATIAN: Jika menggunakan variant ini, sesuaikan prisma/schema.prisma
-- dengan `@db.Enum` atau tetap pakai String dengan aplikasi-level validation.
-- Prisma 5 tidak mendukung native PG enum tanpa driver adapter tambahan,
-- jadi variant ini bersifat opsional / untuk referensi.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE user_role_enum      AS ENUM ('CUSTOMER', 'PROVIDER', 'ADMIN');
  CREATE TYPE service_status_enum AS ENUM ('ACTIVE', 'DRAFT', 'ARCHIVED');
  CREATE TYPE order_status_enum   AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
  CREATE TYPE payment_method_enum AS ENUM ('transfer', 'ewallet', 'cod');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================================================
-- Tabel: "User"
-- ==========================================================================
CREATE TABLE IF NOT EXISTS "User" (
    "id"            SERIAL          PRIMARY KEY,
    "name"          TEXT,
    "email"         TEXT            NOT NULL,
    "passwordHash"  TEXT,
    "phone"         TEXT,
    "role"          user_role_enum  NOT NULL DEFAULT 'CUSTOMER',
    "bio"           TEXT,
    "avatarUrl"     TEXT,
    "location"      TEXT,
    -- Kota yang sudah dinormalkan (lowercase), diturunkan dari "location".
    -- Filter katalog mencocokkan kolom ini; lihat lib/location.ts.
    "city"          TEXT,
    "createdAt"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_email_key" UNIQUE ("email")
);

-- ==========================================================================
-- Tabel: "Category"
-- ==========================================================================
CREATE TABLE IF NOT EXISTS "Category" (
    "id"            SERIAL          PRIMARY KEY,
    "name"          TEXT            NOT NULL,
    "slug"          TEXT            NOT NULL,
    "icon"          TEXT,
    "description"   TEXT,

    CONSTRAINT "Category_name_key" UNIQUE ("name"),
    CONSTRAINT "Category_slug_key" UNIQUE ("slug")
);

-- ==========================================================================
-- Tabel: "Service"
-- ==========================================================================
CREATE TABLE IF NOT EXISTS "Service" (
    "id"               SERIAL              PRIMARY KEY,
    "providerId"       INTEGER             NOT NULL,
    "categoryId"       INTEGER             NOT NULL,
    "title"            TEXT                NOT NULL,
    "slug"             TEXT                NOT NULL,
    "description"      TEXT                NOT NULL,
    "price"            DOUBLE PRECISION    NOT NULL,
    "deliveryTimeDays"  INTEGER             NOT NULL,
    "ratingAvg"        DOUBLE PRECISION    NOT NULL DEFAULT 0,
    "totalReviews"     INTEGER             NOT NULL DEFAULT 0,
    "status"           service_status_enum NOT NULL DEFAULT 'DRAFT',
    "createdAt"        TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Service_slug_key" UNIQUE ("slug"),
    CONSTRAINT "Service_providerId_fkey"
        FOREIGN KEY ("providerId") REFERENCES "User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Service_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Filter katalog per kota memakai (role, city); lihat @@index di schema.prisma.
CREATE INDEX IF NOT EXISTS "User_role_city_idx"
    ON "User" ("role", "city");

CREATE INDEX IF NOT EXISTS "Service_categoryId_status_idx"
    ON "Service" ("categoryId", "status");
CREATE INDEX IF NOT EXISTS "Service_providerId_idx"
    ON "Service" ("providerId");

-- ==========================================================================
-- Tabel: "SavedService"
-- ==========================================================================
CREATE TABLE IF NOT EXISTS "SavedService" (
    "id"          SERIAL          PRIMARY KEY,
    "userId"      INTEGER         NOT NULL,
    "serviceId"   INTEGER         NOT NULL,
    "createdAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedService_userId_serviceId_key" UNIQUE ("userId", "serviceId"),
    CONSTRAINT "SavedService_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SavedService_serviceId_fkey"
        FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SavedService_serviceId_idx"
    ON "SavedService" ("serviceId");

-- ==========================================================================
-- Tabel: "Order"
-- ==========================================================================
CREATE TABLE IF NOT EXISTS "Order" (
    "id"            SERIAL              PRIMARY KEY,
    "customerId"    INTEGER             NOT NULL,
    "serviceId"     INTEGER             NOT NULL,
    "totalPrice"    DOUBLE PRECISION    NOT NULL,
    "status"        order_status_enum   NOT NULL DEFAULT 'PENDING',
    "paymentMethod" payment_method_enum,
    "orderNotes"    TEXT,
    "deadline"      TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt"   TIMESTAMP(3),

    CONSTRAINT "Order_customerId_fkey"
        FOREIGN KEY ("customerId") REFERENCES "User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_serviceId_fkey"
        FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Order_customerId_status_idx"
    ON "Order" ("customerId", "status");
CREATE INDEX IF NOT EXISTS "Order_serviceId_idx"
    ON "Order" ("serviceId");

-- ==========================================================================
-- Tabel: "Message"
-- ==========================================================================
CREATE TABLE IF NOT EXISTS "Message" (
    "id"          SERIAL          PRIMARY KEY,
    "orderId"     INTEGER         NOT NULL,
    "senderId"    INTEGER         NOT NULL,
    "content"     TEXT            NOT NULL,
    "createdAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "Order"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Message_senderId_fkey"
        FOREIGN KEY ("senderId") REFERENCES "User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Message_orderId_createdAt_idx"
    ON "Message" ("orderId", "createdAt");

-- ==========================================================================
-- Tabel: "Review"
-- ==========================================================================
CREATE TABLE IF NOT EXISTS "Review" (
    "id"          SERIAL          PRIMARY KEY,
    "orderId"     INTEGER         NOT NULL,
    "reviewerId"  INTEGER         NOT NULL,
    "rating"      INTEGER         NOT NULL,
    "comment"     TEXT,
    "createdAt"   TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "Order"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Review_reviewerId_fkey"
        FOREIGN KEY ("reviewerId") REFERENCES "User"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ==========================================================================
-- Trigger: auto-update "updatedAt" (mensimulasikan Prisma @updatedAt)
-- ==========================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "User_updatedAt_trigger"
    BEFORE UPDATE ON "User"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
