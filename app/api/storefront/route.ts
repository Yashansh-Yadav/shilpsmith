import { prisma } from "../../../lib/prisma";
import { ok, handle } from "../../../lib/apiResponse";

export const dynamic = "force-dynamic";
// Cheap edge cache so the homepage doesn't re-query Postgres on every hit.
// Revalidate every minute — admin edits show up quickly enough.
export const revalidate = 60;

const PRODUCT_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  images: { select: { url: true }, orderBy: { id: "asc" as const } },
  variants: {
    select: { id: true, name: true, priceModifier: true, stock: true },
    orderBy: { createdAt: "asc" as const },
  },
};

// Aggregates everything the homepage needs in one roundtrip:
//   - featured: editor-picked products
//   - newest:   recently added products (any catalog age, capped to 12)
//   - trending: most-ordered products in the last 30 days; falls back to
//               featured/newest when there's no order data yet
//   - categories: all categories so the chip row stays adaptive
//   - testimonials: approved reviews with non-empty comments
export const GET = handle(async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [featured, newest, trendingItems, categories, testimonials] =
    await Promise.all([
      prisma.product.findMany({
        where: { deletedAt: null, featured: true },
        include: PRODUCT_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.product.findMany({
        where: { deletedAt: null },
        include: PRODUCT_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          order: {
            deletedAt: null,
            createdAt: { gte: thirtyDaysAgo },
            status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] },
          },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 12,
      }),
      prisma.category.findMany({
        select: { id: true, name: true, slug: true, image: true },
        orderBy: { name: "asc" },
      }),
      prisma.review.findMany({
        where: {
          approved: true,
          OR: [{ comment: { not: null } }, { title: { not: null } }],
        },
        select: {
          id: true,
          rating: true,
          title: true,
          comment: true,
          customerName: true,
          createdAt: true,
          product: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

  // Resolve trending productIds → full products (preserves group order).
  let trending: typeof featured = [];
  if (trendingItems.length > 0) {
    const ids = trendingItems.map((t) => t.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, deletedAt: null },
      include: PRODUCT_INCLUDE,
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    trending = ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  }
  // Graceful fallback for a fresh catalog with no orders yet.
  if (trending.length === 0) trending = featured.length > 0 ? featured : newest;

  return ok({
    featured,
    newest,
    trending,
    categories,
    testimonials,
  });
});
