-- AlterTable: allow guest reviews keyed by email
ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_userId_fkey";
ALTER TABLE "Review" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Review" ADD COLUMN "customerEmail" TEXT;
ALTER TABLE "Review" ADD COLUMN "customerName" TEXT;
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Replace (userId, productId) unique with (customerEmail, productId)
DROP INDEX IF EXISTS "Review_userId_productId_key";
CREATE UNIQUE INDEX "Review_customerEmail_productId_key" ON "Review"("customerEmail", "productId");
