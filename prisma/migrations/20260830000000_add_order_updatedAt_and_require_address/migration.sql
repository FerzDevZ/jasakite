-- Add updatedAt to Order (P1-5) and ensure address is not null (P0-1)
-- For SQLite: add column as nullable first, backfill, then Prisma will manage @updatedAt
ALTER TABLE "Order" ADD COLUMN "updatedAt" DATETIME;
UPDATE "Order" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;
UPDATE "Order" SET "address" = 'Jl. Contoh No. 1, Jakarta' WHERE "address" IS NULL;
