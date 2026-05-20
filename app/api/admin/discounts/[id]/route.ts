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
  if (input.code !== undefined) data.code = input.code;
  if (input.description !== undefined) data.description = input.description;
  if (input.type !== undefined) data.type = input.type;
  if (input.value !== undefined) {
    data.value = new Prisma.Decimal(input.value.toFixed(2));
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

  const code = await prisma.discountCode.update({ where: { id }, data });
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
