// lib/storefront.ts
//
// Everything the homepage needs, in one place, callable from both the server
// component that renders the page and /api/storefront (kept for the client-side
// refresh path and any external consumer).
//
// Why this exists: the homepage used to fetch /api/storefront in a useEffect,
// which meant the entire catalog — featured, new arrivals, trending,
// testimonials — was absent from the server HTML. Google only sees it after its
// deferred JavaScript pass, and AI crawlers never run JS at all, so they saw a
// page of empty shelves. The page now awaits this directly.
//
// NOTE: `variants` is deliberately not selected. No storefront card reads it
// (only ProductDetail does, from a different query), it's dead payload for ~36
// products, and its Decimal `priceModifier` cannot cross the server→client
// boundary without conversion.

import type { Prisma } from "@prisma/client";

import { prisma } from "./prisma";
import { cardAutoPercent } from "./discounts";
import { loadActiveAutomaticDiscounts } from "./discountQuery";
import { loadRatings, NO_RATING, type ProductRating } from "./ratings";

const CARD_SELECT = {
  id: true,
  categoryId: true,
  name: true,
  slug: true,
  shortDescription: true,
  description: true,
  price: true,
  discountPrice: true,
  customizable: true,
  featured: true,
  stock: true,
  stockStatus: true,
  modelUrl: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
  images: { select: { url: true }, orderBy: { id: "asc" as const }, take: 1 },
} as const;

const TESTIMONIAL_SELECT = {
  id: true,
  rating: true,
  title: true,
  comment: true,
  customerName: true,
  createdAt: true,
  product: { select: { id: true, name: true, slug: true } },
} as const;

// Derived from the query rather than hand-written, so a schema change surfaces
// as a type error here instead of a runtime surprise on the homepage.
type CardRow = Prisma.ProductGetPayload<{ select: typeof CARD_SELECT }>;
type TestimonialRow = Prisma.ReviewGetPayload<{
  select: typeof TESTIMONIAL_SELECT;
}>;

export type StorefrontCard = Omit<CardRow, "createdAt"> & {
  /** ISO string — Date survives RSC props but not the JSON API, so normalize. */
  createdAt: string;
  eventDiscountPercent: number | null;
  rating: ProductRating;
};

export interface StorefrontData {
  featured: StorefrontCard[];
  newest: StorefrontCard[];
  trending: StorefrontCard[];
  categories: { id: number; name: string; slug: string; image: string | null }[];
  testimonials: (Omit<TestimonialRow, "createdAt"> & { createdAt: string })[];
}

/**
 * Aggregates the homepage payload:
 *   - featured:  editor-picked products
 *   - newest:    recently added (capped to 12)
 *   - trending:  most-ordered in the last 30 days, falling back to
 *                featured/newest so a fresh catalog never shows an empty shelf
 *   - categories: all of them, so the chip row stays adaptive
 *   - testimonials: approved reviews that actually say something
 */
export async function getStorefrontData(): Promise<StorefrontData> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [featured, newest, trendingItems, categories, testimonials] =
    await Promise.all([
      prisma.product.findMany({
        where: { deletedAt: null, featured: true },
        select: CARD_SELECT,
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
      prisma.product.findMany({
        where: { deletedAt: null },
        select: CARD_SELECT,
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
        select: TESTIMONIAL_SELECT,
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

  // Resolve trending productIds → full products, preserving the group order.
  let trending: typeof featured = [];
  if (trendingItems.length > 0) {
    const ids = trendingItems.map((t) => t.productId);
    const rows = await prisma.product.findMany({
      where: { id: { in: ids }, deletedAt: null },
      select: CARD_SELECT,
    });
    const byId = new Map(rows.map((p) => [p.id, p]));
    trending = ids.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  }
  if (trending.length === 0) trending = featured.length > 0 ? featured : newest;

  // The three shelves overlap heavily, so resolve every badge in one grouped
  // query rather than one per shelf.
  const [autoDiscounts, ratings] = await Promise.all([
    loadActiveAutomaticDiscounts(prisma),
    loadRatings(prisma, [...featured, ...newest, ...trending].map((p) => p.id)),
  ]);

  // Date → ISO string so the payload is identical whether it arrives through
  // the API (JSON) or straight into a client component as an RSC prop.
  const decorate = (p: (typeof featured)[number]): StorefrontCard => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    eventDiscountPercent: cardAutoPercent(p, autoDiscounts, now),
    rating: ratings.get(p.id) ?? NO_RATING,
  });

  return {
    featured: featured.map(decorate),
    newest: newest.map(decorate),
    trending: trending.map(decorate),
    categories,
    testimonials: testimonials.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}
