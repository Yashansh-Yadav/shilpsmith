import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "../../../../../lib/prisma";
import { ok, handle } from "../../../../../lib/apiResponse";
import { parseJson } from "../../../../../lib/middleware/validateRequest";
import { rateLimit } from "../../../../../lib/middleware/rateLimit";
import { getRazorpay, verifyRazorpaySignature } from "../../../../../lib/payment";
import { AuthError, ConflictError, NotFoundError } from "../../../../../lib/errors";
import { sendOrderConfirmationEmail } from "../../../../../lib/email";
import { notifyCustomerOrder } from "../../../../../lib/whatsappCustomer";
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

  // The signature only proves "a real payment happened on this merchant
  // account" — it carries no link to THIS order or amount. paymentReference is
  // what binds the two, and it's written by create-order. Treating it as
  // optional meant an attacker could skip create-order (this route is public),
  // leave it null, and replay one genuine ₹1 payment's signature against any
  // order. It must be present AND match.
  if (!order.paymentReference) {
    throw new ConflictError(
      "No payment was initiated for this order. Start the payment before verifying."
    );
  }
  if (order.paymentReference !== input.razorpayOrderId) {
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

  // A valid signature still says nothing about how much was paid, or whether
  // the money was actually captured. Ask Razorpay directly rather than trusting
  // the client's word for it.
  const payment = await getRazorpay().payments.fetch(input.paymentId);

  if (payment.order_id !== input.razorpayOrderId) {
    logger.warn("Razorpay payment/order mismatch", {
      orderId: order.id,
      paymentId: input.paymentId,
      expected: input.razorpayOrderId,
      actual: payment.order_id,
    });
    throw new AuthError("Payment does not belong to this order");
  }

  if (payment.status !== "captured") {
    throw new ConflictError(
      `Payment has not been captured (status: ${payment.status})`
    );
  }

  // Razorpay deals in paise; Order.total is rupees.
  const expectedPaise = Math.round(Number(order.total) * 100);
  if (Number(payment.amount) !== expectedPaise) {
    logger.warn("Razorpay amount mismatch", {
      orderId: order.id,
      expectedPaise,
      paidPaise: Number(payment.amount),
    });
    throw new ConflictError("Paid amount does not match the order total");
  }

  // Conditional update: only the request that flips PENDING → COMPLETED fires
  // the side effects, so two concurrent verifies can't double-send the email.
  const claimed = await prisma.order.updateMany({
    where: { id: order.id, paymentStatus: "PENDING" },
    data: {
      paymentStatus: "COMPLETED",
      status: "CONFIRMED",
      paymentReference: input.paymentId,
    },
  });

  if (claimed.count === 0) {
    // Someone else got there first — treat as the idempotent no-op above.
    const current = await prisma.order.findFirstOrThrow({
      where: { id: order.id },
    });
    return ok({
      orderId: current.id,
      orderNumber: current.orderNumber,
      status: current.status,
      paymentStatus: current.paymentStatus,
    });
  }

  const updated = await prisma.order.findFirstOrThrow({
    where: { id: order.id },
    include: { items: true },
  });

  sendOrderConfirmationEmail(updated).catch((error) => {
    logger.error("Order confirmation email failed (post-payment)", {
      error,
      orderNumber: updated.orderNumber,
    });
  });

  // Best-effort customer WhatsApp — payment received → order confirmed.
  notifyCustomerOrder(updated, updated.status).catch((error) => {
    logger.error("Order confirmation WhatsApp failed (post-payment)", {
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
