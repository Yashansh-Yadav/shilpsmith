import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "../../../../lib/prisma";
import { ok, handle } from "../../../../lib/apiResponse";

export const dynamic = "force-dynamic";

// Support tickets are stored as Lead rows tagged with `"type":"support"` in
// their JSON notes (see /api/support). This lists them for the admin inbox,
// parsing the structured contact details back out of `notes`.
export const GET = handle(async (request: NextRequest) => {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "";
  const page = Math.max(1, Number(url.searchParams.get("page") || "1") || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("pageSize") || "20") || 20)
  );

  const where: Prisma.LeadWhereInput = {
    notes: { contains: '"type":"support"' },
  };
  if (status) where.status = status;

  const [total, rows] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items = rows.map((r) => {
    let meta: Record<string, string> = {};
    try {
      meta = r.notes ? (JSON.parse(r.notes) as Record<string, string>) : {};
    } catch {
      /* legacy / malformed notes — fall back to columns */
    }
    return {
      id: r.id,
      name: r.customerName,
      email: meta.email ?? "",
      phone: meta.phone || r.phone || "",
      category: meta.category ?? "other",
      orderNumber: meta.orderNumber ?? "",
      message: r.message,
      status: r.status,
      createdAt: r.createdAt,
    };
  });

  return ok({
    items,
    page,
    pageSize,
    total,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  });
});
