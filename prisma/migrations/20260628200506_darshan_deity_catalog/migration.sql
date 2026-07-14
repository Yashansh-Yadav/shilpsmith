-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "deityId" INTEGER;

-- CreateTable
CREATE TABLE "Deity" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "nameEn" TEXT NOT NULL,
    "nameHi" TEXT NOT NULL,
    "mantra" TEXT NOT NULL,
    "transliteration" TEXT,
    "aartis" JSONB NOT NULL DEFAULT '[]',
    "bhajans" JSONB NOT NULL DEFAULT '[]',
    "scriptures" JSONB NOT NULL DEFAULT '[]',
    "specialDays" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Deity_key_key" ON "Deity"("key");

-- CreateIndex
CREATE INDEX "Deity_active_idx" ON "Deity"("active");

-- CreateIndex
CREATE INDEX "Deity_sortOrder_idx" ON "Deity"("sortOrder");

-- CreateIndex
CREATE INDEX "Product_deityId_idx" ON "Product"("deityId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_deityId_fkey" FOREIGN KEY ("deityId") REFERENCES "Deity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

