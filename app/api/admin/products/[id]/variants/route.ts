import type { NextRequest } from "next/server";

import { prisma } from "../../../../../../lib/prisma";
import { Prisma } from "@prisma/client";
import { ok, created, handle } from "../../../../../../lib/apiResponse";
import { parseJson } from "../../../../../../lib/middleware/validateRequest";
import { ProductVariantCreateSchema } from "../../../../../../lib/validators";
import { NotFoundError, ValidationError } from "../../../../../../lib/errors";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function resolveProductId(ctx: Ctx): Promise<number> {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ValidationError("Invalid product id");
  }
  return n;
}

export const GET = handle(async (_req: NextRequest, ctx: Ctx) => {
  const productId = await resolveProductId(ctx);

  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true },
  });
  if (!product) throw new NotFoundError("Product not found");

  const variants = await prisma.productVariant.findMany({
    where: { productId },
    orderBy: { createdAt: "asc" },
  });
  return ok(variants);
});

export const POST = handle(async (request: NextRequest, ctx: Ctx) => {
  const productId = await resolveProductId(ctx);

  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true },
  });
  if (!product) throw new NotFoundError("Product not found");

  const input = await parseJson(request, ProductVariantCreateSchema);

  const variant = await prisma.productVariant.create({
    data: {
      productId,
      name: input.name,
      sku: input.sku ?? null,
      priceModifier: new Prisma.Decimal(input.priceModifier.toFixed(2)),
      stock: input.stock,
      attributes: input.attributes
        ? (input.attributes as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });

  return created(variant, "Variant created");
});
