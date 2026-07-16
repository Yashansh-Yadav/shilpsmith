// lib/discountQuery.ts
//
// Server-only bridge between the database and the pure discount logic in
// lib/discounts.ts. Kept separate so lib/discounts.ts stays Prisma-free and
// usable in the client bundle.

import type { PrismaClient, Prisma } from "@prisma/client";
import type { DiscountRule } from "./discounts";

type DiscountWithProducts = Prisma.DiscountCodeGetPayload<{
  include: { products: { select: { productId: true } } };
}>;

function toRule(d: DiscountWithProducts): DiscountRule {
  return {
    id: d.id,
    code: d.code,
    name: d.name,
    type: d.type,
    value: Number(d.value),
    scope: d.scope,
    categoryId: d.categoryId,
    productIds: d.products.map((p) => p.productId),
    minOrderValue: d.minOrderValue != null ? Number(d.minOrderValue) : null,
    maxUses: d.maxUses,
    usedCount: d.usedCount,
    startsAt: d.startsAt,
    expiresAt: d.expiresAt,
    active: d.active,
  };
}

/**
 * The candidate discounts for an order: every active automatic discount (no
 * code), plus the customer's typed code if they entered one. resolveBestDiscount
 * decides which single one wins.
 *
 * Only `active` rows are loaded; the finer checks (window, usage, min order,
 * scope eligibility) run in the pure resolver so the client can preview the
 * exact same outcome.
 */
export async function loadDiscountCandidates(
  prisma: PrismaClient,
  typedCode: string | null
): Promise<DiscountRule[]> {
  const code = typedCode?.trim().toUpperCase() || null;

  const rows = await prisma.discountCode.findMany({
    where: {
      active: true,
      OR: [
        { code: null }, // automatic event discounts
        ...(code ? [{ code }] : []), // the one the customer typed
      ],
    },
    include: { products: { select: { productId: true } } },
  });

  return rows.map(toRule);
}

/**
 * Active automatic (no-code) discounts, for advertising on product cards. The
 * pure cardAutoPercent() decides which of these can actually be shown.
 */
export async function loadActiveAutomaticDiscounts(
  prisma: PrismaClient
): Promise<DiscountRule[]> {
  const rows = await prisma.discountCode.findMany({
    where: { active: true, code: null },
    include: { products: { select: { productId: true } } },
  });
  return rows.map(toRule);
}