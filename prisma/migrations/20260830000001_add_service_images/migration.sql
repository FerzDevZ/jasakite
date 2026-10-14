-- Add imageUrl and images to Service (missing from initial migrations)
ALTER TABLE "Service" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Service" ADD COLUMN "images" TEXT;
