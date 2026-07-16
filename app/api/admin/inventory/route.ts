import type { NextRequest } from "next/server";

import { prisma } from "../../../../lib/prisma";
import { ok, handle } from "../../../../lib/apiResponse";
import { parseJson } from "../../../../lib/middleware/validateRequest";
import { InventoryBatchSchema } from "../../../../lib/validators";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      stock: true,
      stockStatus: true,
      lowStockThreshold: true,
      price: true,
      images: { select: { url: true }, take: 1 },
      variants: {
        select: { id: true, name: true, sku: true, stock: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return ok(products);
});

export const PUT = handle(async (request: NextRequest) => {
  const input = await parseJson(request, InventoryBatchSchema);

  await prisma.$transaction(async (tx) => {
    if (input.products?.length) {
      // Existing thresholds, so a stock-only save can still derive the right
      // status without the client having to send one.
      const existing = new Map(
        (
          await tx.product.findMany({
            where: { id: { in: input.products.map((p) => p.id) } },
            select: { id: true, lowStockThreshold: true },
          })
        ).map((p) => [p.id, p])
      );

      for (const p of input.products) {
        const data: Record<string, unknown> = {};
        if (p.stock !== undefined) data.stock = p.stock;
        if (p.lowStockThreshold !== undefined) data.lowStockThreshold = p.lowStockThreshold;

        if (p.stockStatus !== undefined) {
          // Explicit admin override always wins — it's how you take something
          // off sale while still holding units.
          data.stockStatus = p.stockStatus;
        } else if (p.stock !== undefined) {
          // Otherwise keep status in step with the count, so the storefront
          // badge and the order route can't disagree.
          const threshold =
            p.lowStockThreshold ?? existing.get(p.id)?.lowStockThreshold ?? 0;
          data.stockStatus =
            p.stock <= 0
              ? "out-of-stock"
              : p.stock <= threshold
                ? "low-stock"
                : "in-stock";
        }

        if (Object.keys(data).length === 0) continue;
        await tx.product.update({ where: { id: p.id }, data });
      }
    }
    if (input.variants?.length) {
      for (const v of input.variants) {
        await tx.productVariant.update({
          where: { id: v.id },
          data: { stock: v.stock },
        });
      }
    }
  });

  return ok({ updated: (input.products?.length ?? 0) + (input.variants?.length ?? 0) }, {
    message: "Inventory updated",
  });
});
