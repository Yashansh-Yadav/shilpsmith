import type { NextRequest } from "next/server";

import { prisma } from "../../../../../lib/prisma";
import { ok, handle } from "../../../../../lib/apiResponse";
import { NotFoundError, ValidationError } from "../../../../../lib/errors";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ email: string }> };

export const GET = handle(async (_req: NextRequest, ctx: Ctx) => {
  const { email: raw } = await ctx.params;
  const email = decodeURIComponent(raw).toLowerCase().trim();
  if (!email || !email.includes("@")) {
    throw new ValidationError("Invalid email");
  }

  const orders = await prisma.order.findMany({
    where: { deletedAt: null, customerEmail: email },
    include: {
      items: { select: { id: true, productName: true, quantity: true, subtotal: true } },
      shippingAddress: true,
    },
    orderBy: { createdAt: "desc" },
  });
  if (orders.length === 0) throw new NotFoundError("No orders for this customer");

  const totalSpent = orders.reduce((acc, o) => acc + Number(o.total), 0);
  const lastOrder = orders[0];

  return ok({
    email,
    name: lastOrder.customerName,
    phone: lastOrder.customerPhone,
    orderCount: orders.length,
    totalSpent,
    firstOrderAt: orders[orders.length - 1].createdAt,
    lastOrderAt: lastOrder.createdAt,
    orders,
  });
});
