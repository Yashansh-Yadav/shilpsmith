import type { NextRequest } from "next/server";

import { prisma } from "../../../../../lib/prisma";
import { ok, handle } from "../../../../../lib/apiResponse";
import { parseJson } from "../../../../../lib/middleware/validateRequest";
import { OrderUpdateSchema } from "../../../../../lib/validators";
import { NotFoundError, ValidationError } from "../../../../../lib/errors";
import { notifyCustomerOrder } from "../../../../../lib/whatsappCustomer";
import { resolveTrackingUrl } from "../../../../../lib/carriers";
import { sendOrderShippedEmail } from "../../../../../lib/email";
import { logger } from "../../../../../lib/logger";

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

const emptyToNull = (v: string | undefined) => {
  if (v === undefined) return undefined;
  const t = v.trim();
  return t === "" ? null : t;
};

export const PUT = handle(async (request: NextRequest, ctx: Ctx) => {
  const id = await resolveId(ctx);
  const input = await parseJson(request, OrderUpdateSchema);

  const data: Record<string, unknown> = {};
  if (input.status !== undefined) data.status = input.status;
  if (input.internalNotes !== undefined) data.internalNotes = input.internalNotes;
  if (input.paymentReference !== undefined) data.paymentReference = input.paymentReference;

  // We need the prior status (to detect a real move) and the existing tracking /
  // shippedAt (so a bare status→SHIPPED can reuse tracking saved earlier).
  const before = await prisma.order.findUnique({
    where: { id },
    select: {
      status: true,
      trackingCarrier: true,
      trackingNumber: true,
      trackingUrl: true,
      shippedAt: true,
    },
  });
  if (!before) throw new NotFoundError("Order not found");

  // Recompute the stored tracking whenever any tracking field is submitted. The
  // admin form always sends carrier + number + optional manual URL together, so
  // we derive the customer-facing trackingUrl fresh from them here.
  const hasTrackingInput =
    input.trackingCarrier !== undefined ||
    input.trackingNumber !== undefined ||
    input.trackingUrl !== undefined;

  let effCarrier = before.trackingCarrier;
  let effNumber = before.trackingNumber;
  let effUrl = before.trackingUrl;

  if (hasTrackingInput) {
    const carrier =
      input.trackingCarrier !== undefined
        ? emptyToNull(input.trackingCarrier)
        : before.trackingCarrier;
    const number =
      input.trackingNumber !== undefined
        ? emptyToNull(input.trackingNumber)
        : before.trackingNumber;
    // A submitted URL is treated as a manual override; absence falls back to the
    // carrier template. We don't reuse the previously-stored (resolved) URL here.
    const manual =
      input.trackingUrl !== undefined ? emptyToNull(input.trackingUrl) : null;
    const url = resolveTrackingUrl(carrier ?? null, number ?? null, manual);

    data.trackingCarrier = carrier ?? null;
    data.trackingNumber = number ?? null;
    data.trackingUrl = url;

    effCarrier = carrier ?? null;
    effNumber = number ?? null;
    effUrl = url;
  }

  const movingToShipped =
    input.status === "SHIPPED" && before.status !== "SHIPPED";

  // Hard block: never dispatch without a resolvable tracking link.
  if (input.status === "SHIPPED" && !effUrl) {
    throw new ValidationError(
      "Add a tracking link before marking this order as Shipped.",
      [
        {
          field: "trackingNumber",
          message: "A carrier + tracking number (or a tracking URL) is required",
        },
      ]
    );
  }

  // Stamp the dispatch time the first time the order moves to SHIPPED.
  if (movingToShipped && !before.shippedAt) {
    data.shippedAt = new Date();
  }

  const order = await prisma.order.update({
    where: { id },
    data,
    include: { items: true, shippingAddress: true, billingAddress: true },
  });

  // Best-effort customer notifications on a real status change. WhatsApp for
  // every messageable status; a richer tracking email additionally on SHIPPED.
  if (input.status !== undefined && before.status !== order.status) {
    notifyCustomerOrder(order, order.status, {
      carrier: effCarrier,
      number: effNumber,
      url: effUrl,
    }).catch((error) =>
      logger.error("Order status customer WhatsApp failed", {
        error,
        orderNumber: order.orderNumber,
      })
    );

    if (order.status === "SHIPPED" && effUrl) {
      sendOrderShippedEmail({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        trackingCarrier: effCarrier,
        trackingNumber: effNumber,
        trackingUrl: effUrl,
      }).catch((error) =>
        logger.error("Order shipped email failed", {
          error,
          orderNumber: order.orderNumber,
        })
      );
    }
  }

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
