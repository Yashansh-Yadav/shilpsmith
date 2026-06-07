import { prisma } from "../../../../lib/prisma";
import { ok, handle } from "../../../../lib/apiResponse";

export const dynamic = "force-dynamic";

type Notification = {
  id: string;
  type: "order" | "support" | "review";
  title: string;
  description: string;
  href: string;
  createdAt: string;
  // Surfaces items that still need action (pending review, unconfirmed order).
  attention?: boolean;
};

const PER_SOURCE = 15;
const TOTAL = 40;

// Unified admin activity feed, derived live from existing tables — no dedicated
// notifications table (and no migration). The client tracks read/unread via a
// "last seen" timestamp, so this endpoint just returns the most recent events.
export const GET = handle(async () => {
  const [orders, supportLeads, reviews] = await Promise.all([
    prisma.order.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        total: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE,
    }),
    prisma.lead.findMany({
      where: { notes: { contains: '"type":"support"' } },
      select: {
        id: true,
        customerName: true,
        message: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE,
    }),
    prisma.review.findMany({
      select: {
        id: true,
        rating: true,
        customerName: true,
        approved: true,
        createdAt: true,
        product: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: PER_SOURCE,
    }),
  ]);

  const items: Notification[] = [
    ...orders.map((o) => ({
      id: `order-${o.id}`,
      type: "order" as const,
      title: `New order ${o.orderNumber}`,
      description: `₹${Number(o.total).toLocaleString("en-IN")} · ${o.customerName}`,
      href: `/admin/orders/${o.id}`,
      createdAt: o.createdAt.toISOString(),
      attention: o.status === "PENDING",
    })),
    ...supportLeads.map((l) => ({
      id: `support-${l.id}`,
      type: "support" as const,
      title: "New support request",
      description: `${l.customerName}: ${truncate(l.message, 70)}`,
      href: "/admin/support",
      createdAt: l.createdAt.toISOString(),
      attention: l.status === "new",
    })),
    ...reviews.map((r) => ({
      id: `review-${r.id}`,
      type: "review" as const,
      title: `New ${r.rating}★ review${r.approved ? "" : " · pending"}`,
      description: `${r.customerName ?? "A customer"} on ${r.product?.name ?? "a product"}`,
      href: "/admin/reviews",
      createdAt: r.createdAt.toISOString(),
      attention: !r.approved,
    })),
  ];

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return ok({ items: items.slice(0, TOTAL) });
});

function truncate(s: string, n: number): string {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? `${clean.slice(0, n)}…` : clean;
}
