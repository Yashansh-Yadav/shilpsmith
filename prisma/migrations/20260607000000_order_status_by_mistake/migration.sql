-- Add BY_MISTAKE to the OrderStatus enum (additive, idempotent).
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'BY_MISTAKE';
