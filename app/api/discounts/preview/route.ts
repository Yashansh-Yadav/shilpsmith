import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "../../../../lib/prisma";
import { ok, handle } from "../../../../lib/apiResponse";
import { parseJson } from "../../../../lib/middleware/validateRequest";
import { rateLimit } from "../../../../lib/middleware/rateLimit";
import {
  effectivePrice,
  resolveBestDiscount,
  rejectionMessage,
  type DiscountLine,
} from "../../../../lib/discounts";
import { loadDiscountCandidates } from "../../../../lib/discountQuery";

export const dynamic = "force-dynamic";

// Preview which discount applies to a cart, BEFORE the order is placed. This is
// a UI convenience only — /api/orders recomputes everything authoritatively and
// never trusts a client price. Prices come from the live catalog here too, so a
// tampered payload can't inflate the discount shown.
const BodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        variantId: z.number().int().positive().optional().nullable(),
        quantity: z.number().int().positive().max(999),
      })
    )
    .min(1)
    .max(100),
  code: z.string().trim().max(40).optional().nullable(),
});

export const POST = handle(async (request: NextRequest) => {
  rateLimit(request, { windowMs: 60_000, max: 30, namespace: "discount-preview" });

  const input = await parseJson(request, BodySchema);

  const productIds = Array.from(new Set(input.items.map((i) => i.productId)));
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, deletedAt: null },
    select: { id: true, price: true, discountPrice: true, categoryId: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const variantIds = Array.from(
    new Set(
      input.items
        .map((i) => i.variantId)
        .filter((v): v is number => typeof v === "number")
    )
  );
  const variants = variantIds.length
    ? await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, priceModifier: true },
      })
    : [];
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  // Build priced lines from the live catalog — same effectivePrice the order
  // route uses, so the preview matches what will actually be charged.
  const lines: DiscountLine[] = [];
  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) continue;
    const base = effectivePrice(product);
    if (base <= 0) continue;
    const mod =
      item.variantId != null
        ? Number(variantMap.get(item.variantId)?.priceModifier ?? 0)
        : 0;
    lines.push({
      productId: product.id,
      categoryId: product.categoryId,
      unitPrice: base + mod,
      quantity: item.quantity,
    });
  }

  const candidates = await loadDiscountCandidates(prisma, input.code ?? null);
  const resolution = resolveBestDiscount(candidates, lines, {
    typedCode: input.code ?? null,
  });

  const rule = candidates.find(
    (c) => c.code?.toUpperCase() === input.code?.trim().toUpperCase()
  );

  return ok({
    discount: resolution.best
      ? {
          amount: resolution.best.amount,
          name: resolution.best.name,
          code: resolution.best.code,
          automatic: resolution.best.automatic,
        }
      : null,
    // When the customer typed a code that lost to a better automatic discount,
    // tell them — otherwise "my code did nothing" looks like a bug.
    codeBeaten: resolution.codeBeaten,
    codeError: resolution.codeRejection
      ? rejectionMessage(resolution.codeRejection, rule?.minOrderValue ?? null)
      : null,
  });
});