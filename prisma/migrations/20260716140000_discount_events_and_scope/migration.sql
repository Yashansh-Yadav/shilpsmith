-- Discount system: automatic event discounts + scoped targeting.
--
-- Makes DiscountCode.code nullable (null = automatic, no code to type), adds a
-- required `name`, a `scope` (ALL/CATEGORY/PRODUCT) with its category link, and
-- a DiscountProduct join for product-scoped discounts.
--
-- The generated diff added `name TEXT NOT NULL` with no default, which fails on
-- a non-empty table. This DB has 0 discount rows today, but write it safely
-- anyway: add nullable, backfill from `code`, then enforce.

-- CreateEnum
CREATE TYPE "DiscountScope" AS ENUM ('ALL', 'CATEGORY', 'PRODUCT');

-- AlterTable: new columns (name nullable for now), code becomes optional
ALTER TABLE "DiscountCode"
  ADD COLUMN "categoryId" INTEGER,
  ADD COLUMN "name" TEXT,
  ADD COLUMN "scope" "DiscountScope" NOT NULL DEFAULT 'ALL',
  ALTER COLUMN "code" DROP NOT NULL;

-- Backfill name for any pre-existing rows (fall back to the code, then a label).
UPDATE "DiscountCode" SET "name" = COALESCE("name", "code", 'Discount') WHERE "name" IS NULL;

-- Now enforce NOT NULL.
ALTER TABLE "DiscountCode" ALTER COLUMN "name" SET NOT NULL;

-- CreateTable
CREATE TABLE "DiscountProduct" (
    "discountCodeId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,

    CONSTRAINT "DiscountProduct_pkey" PRIMARY KEY ("discountCodeId","productId")
);

-- CreateIndex
CREATE INDEX "DiscountProduct_productId_idx" ON "DiscountProduct"("productId");
CREATE INDEX "DiscountCode_categoryId_idx" ON "DiscountCode"("categoryId");

-- AddForeignKey
ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DiscountProduct" ADD CONSTRAINT "DiscountProduct_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "DiscountCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DiscountProduct" ADD CONSTRAINT "DiscountProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;