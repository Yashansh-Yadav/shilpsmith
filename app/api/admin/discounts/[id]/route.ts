import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

import { prisma } from "../../../../../lib/prisma";
import { ok, handle } from "../../../../../lib/apiResponse";
import { parseJson } from "../../../../../lib/middleware/validateRequest";
import { DiscountCodeUpdateSchema } from "../../../../../lib/validators";
import { ValidationError } from "../../../../../lib/errors";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function resolveId(ctx: Ctx): Promise<number> {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ValidationError("Invalid discount id");
  }
  return n;
}

export const PUT = handle(async (request: NextRequest, ctx: Ctx) => {
  const id = await resolveId(ctx);
  const input = await parseJson(request, DiscountCodeUpdateSchema);

  const data: Record<string, unknown> = {};
  if (input.code !== undefined) data.code = input.code ?? null;
  if (input.name !== undefined) data.name = input.name;
  if (input.description !== undefined) data.description = input.description;
  if (input.type !== undefined) data.type = input.type;
  if (input.value !== undefined) {
    data.value = new Prisma.Decimal(input.value.toFixed(2));
  }
  if (input.scope !== undefined) {
    data.scope = input.scope;
    // Changing scope clears the previous scope's target. CATEGORY sets its own
    // categoryId below; PRODUCT rewrites the join; ALL clears both.
    if (input.scope !== "CATEGORY") data.categoryId = null;
  }
  if (input.categoryId !== undefined && (input.scope ?? "CATEGORY") === "CATEGORY") {
    data.categoryId = input.categoryId ?? null;
  }
  if (input.minOrderValue !== undefined) {
    data.minOrderValue =
      input.minOrderValue !== null
        ? new Prisma.Decimal(input.minOrderValue.toFixed(2))
        : null;
  }
  if (input.maxUses !== undefined) data.maxUses = input.maxUses;
  if (input.perUserLimit !== undefined) data.perUserLimit = input.perUserLimit;
  if (input.startsAt !== undefined) data.startsAt = input.startsAt;
  if (input.expiresAt !== undefined) data.expiresAt = input.expiresAt;
  if (input.active !== undefined) data.active = input.active;

  // When the discount is (or becomes) product-scoped and a product list was
  // sent, replace the join rows to match exactly.
  const rewriteProducts =
    input.productIds !== undefined &&
    (input.scope === "PRODUCT" || input.scope === undefined);

  const code = await prisma.$transaction(async (tx) => {
    const updated = await tx.discountCode.update({ where: { id }, data });
    if (rewriteProducts) {
      await tx.discountProduct.deleteMany({ where: { discountCodeId: id } });
      if (updated.scope === "PRODUCT" && input.productIds?.length) {
        await tx.discountProduct.createMany({
          data: input.productIds.map((productId) => ({ discountCodeId: id, productId })),
        });
      }
    }
    return tx.discountCode.findUniqueOrThrow({
      where: { id },
      include: { products: { select: { productId: true } } },
    });
  });

  return ok(code, { message: "Discount updated" });
});

export const DELETE = handle(async (_req: NextRequest, ctx: Ctx) => {
  const id = await resolveId(ctx);

  // Discounts referenced by orders cannot be hard-deleted (FK from Order). We
  // mark them inactive instead so existing analytics still resolve the code.
  const refs = await prisma.order.count({ where: { discountCodeId: id } });
  if (refs > 0) {
    const code = await prisma.discountCode.update({
      where: { id },
      data: { active: false },
    });
    return ok(code, {
      message: `Discount used by ${refs} order(s); marked inactive instead of deleted`,
    });
  }

  await prisma.discountCode.delete({ where: { id } });
  return ok({ id }, { message: "Discount deleted" });
});
