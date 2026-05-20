import type { NextRequest } from "next/server";
import { z } from "zod";

import { prisma } from "../../../../lib/prisma";
import { ok, handle } from "../../../../lib/apiResponse";
import { parseQuery } from "../../../../lib/middleware/validateRequest";

export const dynamic = "force-dynamic";

const QuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const GET = handle(async (request: NextRequest) => {
  const q = parseQuery(request, QuerySchema);

  // Customers are derived from order rows (no user accounts yet). Group by
  // email and aggregate counts/totals; the most recent order's name/phone are
  // used as the display values.
  const groups = await prisma.order.groupBy({
    by: ["customerEmail"],
    where: {
      deletedAt: null,
      ...(q.search
        ? {
            OR: [
              { customerEmail: { contains: q.search, mode: "insensitive" } },
              { customerName: { contains: q.search, mode: "insensitive" } },
              { customerPhone: { contains: q.search } },
            ],
          }
        : {}),
    },
    _count: { _all: true },
    _sum: { total: true },
    _max: { createdAt: true },
    orderBy: { _max: { createdAt: "desc" } },
  });

  const total = groups.length;
  const paged = groups.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);

  // Pull the most-recent order per email in the paged window to attach
  // display name/phone. One query per page (small).
  const customers = await Promise.all(
    paged.map(async (g) => {
      const last = await prisma.order.findFirst({
        where: { customerEmail: g.customerEmail, deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          customerName: true,
          customerPhone: true,
          createdAt: true,
        },
      });
      return {
        email: g.customerEmail,
        name: last?.customerName ?? "",
        phone: last?.customerPhone ?? "",
        orderCount: g._count._all,
        totalSpent: Number(g._sum.total ?? 0),
        lastOrderAt: g._max.createdAt,
      };
    })
  );

  return ok({
    items: customers,
    page: q.page,
    pageSize: q.pageSize,
    total,
    pages: Math.max(1, Math.ceil(total / q.pageSize)),
  });
});
