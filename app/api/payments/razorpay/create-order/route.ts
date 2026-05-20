import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "../../../../../lib/prisma";
import { created, handle } from "../../../../../lib/apiResponse";
import { parseJson } from "../../../../../lib/middleware/validateRequest";
import { rateLimit } from "../../../../../lib/middleware/rateLimit";
import { getRazorpay } from "../../../../../lib/payment";
import { ConflictError, NotFoundError } from "../../../../../lib/errors";

export const dynamic = "force-dynamic";

const BodySchema = z.object({ orderId: z.number().int().positive() });

export const POST = handle(async (request: NextRequest) => {
  rateLimit(request, { windowMs: 60_000, max: 20, namespace: "rzp-create" });

  const { orderId } = await parseJson(request, BodySchema);

  const order = await prisma.order.findFirst({
    where: { id: orderId, deletedAt: null },
  });
  if (!order) throw new NotFoundError("Order not found");
  if (order.paymentMethod !== "RAZORPAY") {
    throw new ConflictError("This order is not configured for Razorpay payment");
  }
  if (order.paymentStatus === "COMPLETED") {
    throw new ConflictError("Order is already paid");
  }

  const amountPaise = Math.round(Number(order.total) * 100);
  const rzp = getRazorpay();

  const rzpOrder = await rzp.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: order.orderNumber,
    notes: { internalOrderId: String(order.id) },
  });

  // Persist the Razorpay order id so we can correlate on verify.
  await prisma.order.update({
    where: { id: order.id },
    data: { paymentReference: rzpOrder.id },
  });

  return created({
    razorpayOrderId: rzpOrder.id,
    amount: amountPaise,
    currency: "INR",
    orderNumber: order.orderNumber,
  });
});
