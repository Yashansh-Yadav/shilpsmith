import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "../../../../../lib/prisma";
import { ok, handle } from "../../../../../lib/apiResponse";
import { parseJson } from "../../../../../lib/middleware/validateRequest";
import { ProductVariantUpdateSchema } from "../../../../../lib/validators";
import { ValidationError } from "../../../../../lib/errors";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function resolveVariantId(ctx: Ctx): Promise<number> {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ValidationError("Invalid variant id");
  }
  return n;
}

export const PUT = handle(async (request: NextRequest, ctx: Ctx) => {
  const id = await resolveVariantId(ctx);
  const input = await parseJson(request, ProductVariantUpdateSchema);

  const data: Record<string, unknown> = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.sku !== undefined) data.sku = input.sku || null;
  if (input.priceModifier !== undefined) {
    data.priceModifier = new Prisma.Decimal(input.priceModifier.toFixed(2));
  }
  if (input.stock !== undefined) data.stock = input.stock;
  if (input.attributes !== undefined) {
    data.attributes = input.attributes
      ? (input.attributes as Prisma.InputJsonValue)
      : Prisma.JsonNull;
  }

  const variant = await prisma.productVariant.update({
    where: { id },
    data,
  });
  return ok(variant, { message: "Variant updated" });
});

export const DELETE = handle(async (_req: NextRequest, ctx: Ctx) => {
  const id = await resolveVariantId(ctx);

  // ProductVariant has no soft-delete column; this is a hard delete. Existing
  // OrderItem rows keep their FK (variant relation is SET NULL on delete).
  await prisma.productVariant.delete({ where: { id } });

  return ok({ id }, { message: "Variant deleted" });
});
