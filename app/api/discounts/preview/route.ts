import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "../../../../lib/prisma";
import { ok, handle } from "../../../../lib/apiResponse";
import { parseJson } from "../../../../lib/middleware/validateRequest";
import { rateLimit } from "../../../../lib/middleware/rateLimit";
import {
  effectivePrice,
  parsePriceString,
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

  // Price lines at LIST so the event/coupon competes with the product sale
  // prices (best single wins, never both) — the same rule the order route uses.
  // Track the sale markdown to compare against.
  let saleMarkdown = 0;
  const lines: DiscountLine[] = [];
  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) continue;
    const listBase = parsePriceString(product.price);
    if (!Number.isFinite(listBase) || listBase <= 0) continue;
    const mod =
      item.variantId != null
        ? Number(variantMap.get(item.variantId)?.priceModifier ?? 0)
        : 0;
    const listUnit = listBase + mod;
    const saleUnit = effectivePrice(product) + mod;
    saleMarkdown += (listUnit - saleUnit) * item.quantity;
    lines.push({
      productId: product.id,
      categoryId: product.categoryId,
      unitPrice: listUnit,
      quantity: item.quantity,
    });
  }
  saleMarkdown = Math.round(saleMarkdown);

  const candidates = await loadDiscountCandidates(prisma, input.code ?? null);
  const resolution = resolveBestDiscount(candidates, lines, {
    typedCode: input.code ?? null,
  });

  const rule = candidates.find(
    (c) => c.code?.toUpperCase() === input.code?.trim().toUpperCase()
  );

  const eventAmount = resolution.best?.amount ?? 0;
  const eventWins = eventAmount > saleMarkdown;
  // The cart already shows sale prices, so surface only the discount BEYOND
  // them — i.e. the extra the event saves over the sale prices. Zero when the
  // sale prices already win.
  const shownAmount = eventWins ? eventAmount - saleMarkdown : 0;

  return ok({
    discount:
      eventWins && shownAmount > 0 && resolution.best
        ? {
            amount: shownAmount,
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