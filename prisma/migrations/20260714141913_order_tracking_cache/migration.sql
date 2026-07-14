-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "trackingData" JSONB,
ADD COLUMN     "trackingSyncedAt" TIMESTAMP(3);

