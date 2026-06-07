import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "../../../../../lib/prisma";
import { ok, handle } from "../../../../../lib/apiResponse";
import { parseJson } from "../../../../../lib/middleware/validateRequest";
import { rateLimit } from "../../../../../lib/middleware/rateLimit";
import { verifyRazorpaySignature } from "../../../../../lib/payment";
import { AuthError, ConflictError, NotFoundError } from "../../../../../lib/errors";
import { sendOrderConfirmationEmail } from "../../../../../lib/email";
import { logger } from "../../../../../lib/logger";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  orderId: z.number().int().positive(),
  paymentId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  signature: z.string().min(1),
});

export const POST = handle(async (request: NextRequest) => {
  rateLimit(request, { windowMs: 60_000, max: 20, namespace: "rzp-verify" });

  const input = await parseJson(request, BodySchema);

  const order = await prisma.order.findFirst({
    where: { id: input.orderId, deletedAt: null },
    include: { items: true },
  });
  if (!order) throw new NotFoundError("Order not found");

  if (order.paymentStatus === "COMPLETED") {
    // Idempotency: if payment is already verified, return success without
    // re-running side effects.
    return ok({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
    });
  }

  if (
    order.paymentReference &&
    order.paymentReference !== input.razorpayOrderId
  ) {
    throw new ConflictError(
      "Payment reference does not match the order's Razorpay order id"
    );
  }

  const valid = verifyRazorpaySignature({
    razorpayOrderId: input.razorpayOrderId,
    paymentId: input.paymentId,
    signature: input.signature,
  });
  if (!valid) {
    logger.warn("Razorpay signature mismatch", {
      orderId: order.id,
      razorpayOrderId: input.razorpayOrderId,
    });
    throw new AuthError("Invalid payment signature");
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "COMPLETED",
      status: "CONFIRMED",
      paymentReference: input.paymentId,
    },
    include: { items: true },
  });

  sendOrderConfirmationEmail(updated).catch((error) => {
    logger.error("Order confirmation email failed (post-payment)", {
      error,
      orderNumber: updated.orderNumber,
    });
  });

  return ok({
    orderId: updated.id,
    orderNumber: updated.orderNumber,
    status: updated.status,
    paymentStatus: updated.paymentStatus,
  });
});
