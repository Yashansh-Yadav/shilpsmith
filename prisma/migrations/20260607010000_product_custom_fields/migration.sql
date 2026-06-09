-- Per-product customization field config (additive, nullable).
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "customFields" JSONB;
