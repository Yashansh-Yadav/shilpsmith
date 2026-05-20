import type { NextRequest } from "next/server";

import { prisma } from "../../../../../lib/prisma";
import { ok, handle } from "../../../../../lib/apiResponse";
import { NotFoundError, ValidationError } from "../../../../../lib/errors";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (request: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) {
    throw new ValidationError("Invalid product id");
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true },
  });
  if (!product) throw new NotFoundError("Product not found");

  const availableOnly =
    new URL(request.url).searchParams.get("available") === "true";

  const variants = await prisma.productVariant.findMany({
    where: {
      productId,
      ...(availableOnly ? { stock: { gt: 0 } } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  return ok(variants);
});
