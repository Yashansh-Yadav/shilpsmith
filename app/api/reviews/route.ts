import type { NextRequest } from "next/server";
import type { OrderStatus } from "@prisma/client";
import { z } from "zod";

import { prisma } from "../../../lib/prisma";
import { ok, created, handle } from "../../../lib/apiResponse";
import {
  parseJson,
  parseQuery,
} from "../../../lib/middleware/validateRequest";
import { GuestReviewCreateSchema } from "../../../lib/validators";
import { ConflictError, ValidationError } from "../../../lib/errors";
import { rateLimit } from "../../../lib/middleware/rateLimit";
import { notifyAdmin } from "../../../lib/notify";
import { logger } from "../../../lib/logger";

export const dynamic = "force-dynamic";

const ListQuerySchema = z
  .object({
    productId: z.coerce.number().int().positive(),
  })
  .strict();

// Public-facing reviews only show APPROVED rows. Moderation queue lives at
// /api/admin/reviews.
export const GET = handle(async (request: NextRequest) => {
  const { productId } = parseQuery(request, ListQuerySchema);
  const reviews = await prisma.review.findMany({
    where: { productId, approved: true },
    select: {
      id: true,
      rating: true,
      title: true,
      comment: true,
      customerName: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Summary stats (average + count) handy for the product page header.
  const agg = await prisma.review.aggregate({
    where: { productId, approved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return ok({
    reviews,
    summary: {
      average: Number(agg._avg.rating ?? 0),
      count: agg._count._all,
    },
  });
});

const APPROVED_BUYER_STATUSES: OrderStatus[] = [
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

export const POST = handle(async (request: NextRequest) => {
  rateLimit(request, { windowMs: 60_000, max: 5, namespace: "reviews" });

  const input = await parseJson(request, GuestReviewCreateSchema);

  // Verified buyer: there has to be at least one non-cancelled/non-pending order
  // from this email that includes the product. Refunded is excluded too.
  const buyerOrder = await prisma.order.findFirst({
    where: {
      customerEmail: input.customerEmail,
      deletedAt: null,
      status: { in: APPROVED_BUYER_STATUSES },
      items: { some: { productId: input.productId } },
    },
    select: { id: true },
  });
  if (!buyerOrder) {
    throw new ValidationError(
      "We could not find a confirmed order from this email for this product",
      [{ field: "customerEmail", message: "No qualifying order found" }]
    );
  }

  try {
    const review = await prisma.review.create({
      data: {
        productId: input.productId,
        customerEmail: input.customerEmail,
        customerName: input.customerName,
        rating: input.rating,
        title: input.title,
        comment: input.comment,
        approved: false, // admin moderation queue
      },
      include: { product: { select: { name: true } } },
    });

    // Best-effort admin notification (email + WhatsApp) — new review to moderate.
    notifyAdmin({
      type: "review",
      title: `New ${review.rating}★ review (pending)`,
      lines: [
        { label: "Product", value: review.product?.name ?? `#${input.productId}` },
        { label: "By", value: input.customerName ?? input.customerEmail },
        { label: "Rating", value: `${review.rating}/5` },
        ...(input.title ? [{ label: "Title", value: input.title }] : []),
      ],
      body: input.comment ?? undefined,
      path: "/admin/reviews",
      replyTo: input.customerEmail,
    }).catch((error) => logger.error("Review admin notification failed", { error }));

    return created(review, "Review submitted — pending moderation");
  } catch (e: unknown) {
    // P2002 will be caught by handle(); we wrap with a friendlier message for
    // this specific (customerEmail, productId) unique conflict.
    if (
      typeof e === "object" &&
      e &&
      "code" in e &&
      (e as { code: string }).code === "P2002"
    ) {
      throw new ConflictError("You've already submitted a review for this product");
    }
    throw e;
  }
});
