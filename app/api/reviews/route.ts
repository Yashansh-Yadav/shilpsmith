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
      verified: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Summary stats (average + count) handy for the product page header, plus the
  // per-star breakdown the product page renders as bars.
  const [agg, byStar] = await Promise.all([
    prisma.review.aggregate({
      where: { productId, approved: true },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.review.groupBy({
      by: ["rating"],
      where: { productId, approved: true },
      _count: { _all: true },
    }),
  ]);

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of byStar) distribution[row.rating] = row._count._all;

  return ok({
    reviews,
    summary: {
      average: Number(agg._avg.rating ?? 0),
      count: agg._count._all,
    },
    distribution,
  });
});

// Statuses that count as a real purchase for the "Verified buyer" badge.
// PENDING is included because COD orders sit there until someone advances them
// in the admin — excluding it locked out buyers for a reason they can't see.
// CANCELLED / REFUNDED / BY_MISTAKE are deliberately absent.
const VERIFIED_BUYER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

export const POST = handle(async (request: NextRequest) => {
  // Two tiers on purpose. The outer one is the abuse guard and counts every
  // request; the inner one caps actual writes. Running a single strict limiter
  // up front meant a shopper who mistyped their order email a couple of times
  // burned the whole budget on rejected requests and got locked out for a
  // minute before they could ever submit.
  rateLimit(request, { windowMs: 60_000, max: 20, namespace: "reviews" });

  const input = await parseJson(request, GuestReviewCreateSchema);

  // Anyone may review — someone who bought at an exhibition or a fair is still a
  // real customer, and moderation (approved: false) is what actually keeps the
  // storefront clean. The purchase check only decides whether the review earns
  // the "Verified buyer" badge.
  //
  // Order number *and* email must match: an email address alone is guessable by
  // anyone who knows the customer, whereas the pair is something only the buyer
  // has. That's what makes the badge worth trusting.
  let verified = false;
  if (input.orderNumber) {
    const buyerOrder = await prisma.order.findFirst({
      where: {
        orderNumber: input.orderNumber,
        customerEmail: input.customerEmail,
        deletedAt: null,
        status: { in: VERIFIED_BUYER_STATUSES },
        items: { some: { productId: input.productId } },
      },
      select: { id: true },
    });

    // Reject rather than silently downgrading — a typo'd order number should be
    // fixable, not quietly cost someone their badge. Clearing the field posts
    // the review unverified.
    if (!buyerOrder) {
      throw new ValidationError(
        "We could not match that order number to this email and product",
        [
          {
            field: "orderNumber",
            message:
              "No matching order. Check the number, or leave it blank to post without the verified badge.",
          },
        ]
      );
    }
    verified = true;
  }

  // Only fully-validated submissions count against the write budget — checked
  // before the create so the limit never trips post-insert. This matters more
  // now that anyone can submit: the unique (customerEmail, productId) index no
  // longer stops repeat posts once someone varies the email.
  rateLimit(request, { windowMs: 60_000, max: 5, namespace: "reviews:create" });

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
        verified,
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
        // Unverified reviews are the ones worth a closer read before approving.
        {
          label: "Buyer",
          value: verified
            ? `Verified (order ${input.orderNumber})`
            : "Unverified — no order number given",
        },
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
