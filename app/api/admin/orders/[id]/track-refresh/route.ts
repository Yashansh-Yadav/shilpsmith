import type { NextRequest } from "next/server";

import { prisma } from "../../../../../../lib/prisma";
import { ok, handle } from "../../../../../../lib/apiResponse";
import { NotFoundError, ValidationError } from "../../../../../../lib/errors";
import { isIThinkConfigured, trackShipment } from "../../../../../../lib/ithink";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Force a fresh live-tracking pull from iThink for one order (admin-triggered,
// bypasses the /track page's cache TTL). Behind the admin middleware.
export const POST = handle(async (_req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new ValidationError("Invalid order id");

  const order = await prisma.order.findFirst({
    where: { id: n, deletedAt: null },
    select: { id: true, trackingNumber: true },
  });
  if (!order) throw new NotFoundError("Order not found");

  if (!isIThinkConfigured()) {
    return ok(
      { configured: false, live: null, liveSyncedAt: null },
      { message: "iThink tracking is not configured (missing API credentials)." }
    );
  }
  if (!order.trackingNumber) {
    throw new ValidationError("Add a tracking (AWB) number before refreshing.");
  }

  const res = await trackShipment(order.trackingNumber);

  if (res.ok) {
    const liveSyncedAt = new Date();
    await prisma.order.update({
      where: { id: order.id },
      data: { trackingData: res.data as object, trackingSyncedAt: liveSyncedAt },
    });
    return ok(
      { configured: true, live: res.data, liveSyncedAt },
      { message: `Live status: ${res.data.current.status || "updated"}` }
    );
  }

  if (!res.configured) {
    return ok({ configured: false, live: null, liveSyncedAt: null });
  }

  const reason = "reason" in res ? res.reason : "error";
  throw new ValidationError(
    `Could not fetch live status from iThink (${reason}).`
  );
});
