import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "../../../../lib/prisma";
import { ok, handle } from "../../../../lib/apiResponse";
import { parseQuery } from "../../../../lib/middleware/validateRequest";
import { OrderListQuerySchema } from "../../../../lib/validators";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export const GET = handle(async (request: NextRequest) => {
  const query = parseQuery(request, OrderListQuerySchema);

  const where: Prisma.OrderWhereInput = { deletedAt: null };
  if (query.status) where.status = query.status;
  if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
  if (query.paymentMethod) where.paymentMethod = query.paymentMethod;
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
  }
  if (query.search) {
    const s = query.search;
    where.OR = [
      { orderNumber: { contains: s, mode: "insensitive" } },
      { customerName: { contains: s, mode: "insensitive" } },
      { customerEmail: { contains: s, mode: "insensitive" } },
      { customerPhone: { contains: s } },
    ];
  }

  // CSV export bypasses pagination so admins can grab the whole filtered set.
  if (query.format === "csv") {
    const rows = await prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    const header = [
      "orderNumber",
      "createdAt",
      "customerName",
      "customerEmail",
      "customerPhone",
      "status",
      "paymentStatus",
      "paymentMethod",
      "itemCount",
      "subtotal",
      "shipping",
      "tax",
      "discount",
      "total",
    ];
    const lines = [header.join(",")];
    for (const o of rows) {
      lines.push(
        [
          o.orderNumber,
          o.createdAt.toISOString(),
          o.customerName,
          o.customerEmail,
          o.customerPhone,
          o.status,
          o.paymentStatus,
          o.paymentMethod,
          o.items.reduce((acc, i) => acc + i.quantity, 0),
          Number(o.subtotal).toFixed(2),
          Number(o.shipping).toFixed(2),
          Number(o.tax).toFixed(2),
          Number(o.discount).toFixed(2),
          Number(o.total).toFixed(2),
        ]
          .map(csvCell)
          .join(",")
      );
    }
    return new Response(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      },
    });
  }

  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        items: { select: { id: true, productName: true, quantity: true, subtotal: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return ok({
    items,
    page: query.page,
    pageSize: query.pageSize,
    total,
    pages: Math.max(1, Math.ceil(total / query.pageSize)),
  });
});
