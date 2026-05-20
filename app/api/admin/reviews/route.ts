import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "../../../../lib/prisma";
import { ok, handle } from "../../../../lib/apiResponse";
import { parseQuery } from "../../../../lib/middleware/validateRequest";

export const dynamic = "force-dynamic";

const QuerySchema = z
  .object({
    status: z.enum(["pending", "approved", "all"]).default("pending"),
    productId: z.coerce.number().int().positive().optional(),
  })
  .strict();

export const GET = handle(async (request: NextRequest) => {
  const q = parseQuery(request, QuerySchema);
  const reviews = await prisma.review.findMany({
    where: {
      ...(q.status === "pending" ? { approved: false } : {}),
      ...(q.status === "approved" ? { approved: true } : {}),
      ...(q.productId ? { productId: q.productId } : {}),
    },
    include: { product: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return ok(reviews);
});
