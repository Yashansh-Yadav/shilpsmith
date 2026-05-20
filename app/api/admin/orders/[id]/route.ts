import type { NextRequest } from "next/server";

import { prisma } from "../../../../../lib/prisma";
import { ok, handle } from "../../../../../lib/apiResponse";
import { parseJson } from "../../../../../lib/middleware/validateRequest";
import { OrderUpdateSchema } from "../../../../../lib/validators";
import { NotFoundError, ValidationError } from "../../../../../lib/errors";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function resolveId(ctx: Ctx): Promise<number> {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new ValidationError("Invalid order id");
  }
  return n;
}

export const GET = handle(async (_req: NextRequest, ctx: Ctx) => {
  const id = await resolveId(ctx);
  const order = await prisma.order.findFirst({
    where: { id, deletedAt: null },
    include: {
      items: true,
      shippingAddress: true,
      billingAddress: true,
      discountCode: true,
    },
  });
  if (!order) throw new NotFoundError("Order not found");
  return ok(order);
});

export const PUT = handle(async (request: NextRequest, ctx: Ctx) => {
  const id = await resolveId(ctx);
  const input = await parseJson(request, OrderUpdateSchema);

  const data: Record<string, unknown> = {};
  if (input.status !== undefined) data.status = input.status;
  if (input.internalNotes !== undefined) data.internalNotes = input.internalNotes;
  if (input.paymentReference !== undefined) data.paymentReference = input.paymentReference;

  const order = await prisma.order.update({
    where: { id },
    data,
    include: { items: true, shippingAddress: true, billingAddress: true },
  });
  return ok(order, { message: "Order updated" });
});

// Soft delete — preserves history for analytics. Use sparingly.
export const DELETE = handle(async (_req: NextRequest, ctx: Ctx) => {
  const id = await resolveId(ctx);
  await prisma.order.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return ok({ id }, { message: "Order archived" });
});
