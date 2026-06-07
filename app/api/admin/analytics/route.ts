import type { NextRequest } from "next/server";
import type { Prisma, OrderStatus } from "@prisma/client";

import { prisma } from "../../../../lib/prisma";
import { ok, handle } from "../../../../lib/apiResponse";
import { parseQuery } from "../../../../lib/middleware/validateRequest";
import { AnalyticsQuerySchema } from "../../../../lib/validators";

export const dynamic = "force-dynamic";

// Orders that we count as "real" revenue: anything not cancelled/refunded.
const COUNTED_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
];

function startOf(period: "today" | "month" | "year"): Date {
  const d = new Date();
  if (period === "today") {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  if (period === "month") {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  return new Date(d.getFullYear(), 0, 1);
}

export const GET = handle(async (request: NextRequest) => {
  const q = parseQuery(request, AnalyticsQuerySchema);

  const baseFilter: Prisma.OrderWhereInput = {
    deletedAt: null,
    status: { in: COUNTED_STATUSES },
  };

  // Range for chart + ranged metrics. Defaults: last 30 days through now.
  const to = q.to ?? new Date();
  const from =
    q.from ?? new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [todayAgg, monthAgg, yearAgg, allTimeCount, rangeOrders, paymentBreakdown] =
    await Promise.all([
      prisma.order.aggregate({
        where: { ...baseFilter, createdAt: { gte: startOf("today") } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.order.aggregate({
        where: { ...baseFilter, createdAt: { gte: startOf("month") } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.order.aggregate({
        where: { ...baseFilter, createdAt: { gte: startOf("year") } },
        _sum: { total: true },
        _count: { _all: true },
      }),
      prisma.order.count({ where: baseFilter }),
      prisma.order.findMany({
        where: { ...baseFilter, createdAt: { gte: from, lte: to } },
        select: { id: true, total: true, createdAt: true, paymentMethod: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.order.groupBy({
        by: ["paymentMethod"],
        where: { ...baseFilter, createdAt: { gte: from, lte: to } },
        _count: { _all: true },
        _sum: { total: true },
      }),
    ]);

  // Bucket orders into daily/weekly/monthly buckets for the chart.
  const bucketKey = (d: Date): string => {
    if (q.granularity === "month") {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
    if (q.granularity === "week") {
      const monday = new Date(d);
      const day = monday.getDay() || 7;
      if (day !== 1) monday.setHours(-24 * (day - 1));
      return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const series = new Map<string, { date: string; revenue: number; orders: number }>();
  for (const o of rangeOrders) {
    const key = bucketKey(o.createdAt);
    const row = series.get(key) ?? { date: key, revenue: 0, orders: 0 };
    row.revenue += Number(o.total);
    row.orders += 1;
    series.set(key, row);
  }
  const chart = Array.from(series.values()).sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );

  const topProducts = await prisma.orderItem.groupBy({
    by: ["productId", "productName"],
    where: {
      order: { ...baseFilter, createdAt: { gte: from, lte: to } },
    },
    _sum: { subtotal: true, quantity: true },
    orderBy: { _sum: { subtotal: "desc" } },
    take: 5,
  });

  const totalRevenueToday = Number(todayAgg._sum.total ?? 0);
  const totalRevenueMonth = Number(monthAgg._sum.total ?? 0);
  const totalRevenueYear = Number(yearAgg._sum.total ?? 0);
  const ordersMonth = monthAgg._count._all;
  const aovMonth = ordersMonth > 0 ? totalRevenueMonth / ordersMonth : 0;

  return ok({
    kpis: {
      revenueToday: totalRevenueToday,
      revenueMonth: totalRevenueMonth,
      revenueYear: totalRevenueYear,
      ordersToday: todayAgg._count._all,
      ordersMonth,
      ordersAllTime: allTimeCount,
      aovMonth,
    },
    chart,
    topProducts: topProducts.map((p) => ({
      productId: p.productId,
      productName: p.productName,
      revenue: Number(p._sum.subtotal ?? 0),
      quantity: p._sum.quantity ?? 0,
    })),
    paymentBreakdown: paymentBreakdown.map((p) => ({
      paymentMethod: p.paymentMethod,
      orders: p._count._all,
      revenue: Number(p._sum.total ?? 0),
    })),
    range: { from: from.toISOString(), to: to.toISOString(), granularity: q.granularity },
  });
});
