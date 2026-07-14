import type { NextRequest } from "next/server";

import { prisma } from "../../../../lib/prisma";
import { ok, handle } from "../../../../lib/apiResponse";
import { parseQuery } from "../../../../lib/middleware/validateRequest";
import { rateLimit } from "../../../../lib/middleware/rateLimit";
import { OrderTrackQuerySchema } from "../../../../lib/validators";
import { NotFoundError } from "../../../../lib/errors";
import { carrierLabel } from "../../../../lib/carriers";
import {
  isIThinkConfigured,
  trackShipment,
  type LiveTracking,
} from "../../../../lib/ithink";

export const dynamic = "force-dynamic";

// How long a cached live-tracking snapshot stays fresh before we re-poll iThink.
const LIVE_TTL_MS = 15 * 60 * 1000;

// Public guest order lookup. Requires BOTH order number and matching email so
// the numeric-id order page can't be enumerated. Rate-limited to blunt guessing.
// Returns a deliberately trimmed payload — no address, payment reference, or
// internal notes.
export const GET = handle(async (request: NextRequest) => {
  rateLimit(request, { windowMs: 60_000, max: 10, namespace: "track" });

  const { orderNumber, email } = parseQuery(request, OrderTrackQuerySchema);

  const order = await prisma.order.findFirst({
    where: {
      orderNumber,
      customerEmail: { equals: email, mode: "insensitive" },
      deletedAt: null,
    },
    select: {
      id: true,
      orderNumber: true,
      customerName: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      subtotal: true,
      shipping: true,
      tax: true,
      discount: true,
      total: true,
      trackingCarrier: true,
      trackingNumber: true,
      trackingUrl: true,
      shippedAt: true,
      trackingData: true,
      trackingSyncedAt: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          productName: true,
          quantity: true,
          unitPrice: true,
          subtotal: true,
        },
      },
    },
  });

  // Same 404 whether the order is missing or the email doesn't match — never
  // reveal that an order number exists.
  if (!order) {
    throw new NotFoundError(
      "No order found with that order number and email. Please check both and try again."
    );
  }

  const {
    id,
    trackingData,
    trackingSyncedAt,
    ...pub
  } = order;

  // Live shipment status from iThink, cached on the order. Only poll when we have
  // an AWB, iThink is configured, the shipment isn't already delivered, and the
  // cached snapshot is stale. Any failure silently falls back to the cache (or
  // null → the page shows the manual status + link-out).
  let live: LiveTracking | null =
    (trackingData as unknown as LiveTracking | null) ?? null;
  let liveSyncedAt: Date | null = trackingSyncedAt ?? null;

  const stale =
    !trackingSyncedAt ||
    Date.now() - trackingSyncedAt.getTime() > LIVE_TTL_MS;

  if (
    order.trackingNumber &&
    isIThinkConfigured() &&
    !live?.delivered &&
    stale
  ) {
    const res = await trackShipment(order.trackingNumber);
    if (res.configured && res.ok) {
      live = res.data;
      liveSyncedAt = new Date();
      await prisma.order.update({
        where: { id },
        data: { trackingData: res.data as object, trackingSyncedAt: liveSyncedAt },
      });
    }
  }

  return ok({
    ...pub,
    trackingCarrierLabel: carrierLabel(order.trackingCarrier),
    live,
    liveSyncedAt,
  });
});
