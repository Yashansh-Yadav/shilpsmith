-- Order.guestToken — unguessable key for the confirmation page.
--
-- Prisma's generated diff was `ADD COLUMN "guestToken" TEXT NOT NULL` with no
-- default, which cannot work: cuid() is produced by the Prisma client, not the
-- database, so existing rows would have nothing to fill it with and the
-- statement fails outright on a non-empty table. Add it nullable, backfill,
-- then tighten — same pattern the other migrations here use.
--
-- gen_random_uuid() is only used for the backfill of pre-existing rows; new
-- rows get a cuid() from the client. Both are unguessable, which is all this
-- column needs to be.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "guestToken" TEXT;

-- Backfill existing rows with distinct values before the unique index lands.
UPDATE "Order" SET "guestToken" = gen_random_uuid()::text WHERE "guestToken" IS NULL;

-- Now that every row has a value, enforce it.
ALTER TABLE "Order" ALTER COLUMN "guestToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Order_guestToken_key" ON "Order"("guestToken");
