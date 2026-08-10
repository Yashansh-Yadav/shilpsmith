// lib/ratings.ts
//
// Server-only helper for attaching approved-review aggregates to product lists.
// Every storefront surface that renders a ProductCard goes through here so the
// star badge means the same thing on the homepage, search, category landings
// and the related shelf.

import type { PrismaClient } from "@prisma/client";

export interface ProductRating {
  /** Mean of approved ratings, 0 when there are none. */
  average: number;
  count: number;
}

export const NO_RATING: ProductRating = { average: 0, count: 0 };

/**
 * One grouped query for a whole page of products rather than a per-card fetch —
 * a card shelf of 12 would otherwise cost 12 Neon roundtrips at ~0.5s each.
 * Only `approved` reviews count, matching what the product page displays.
 */
export async function loadRatings(
  db: PrismaClient,
  productIds: number[]
): Promise<Map<number, ProductRating>> {
  const ids = [...new Set(productIds)];
  if (ids.length === 0) return new Map();

  const rows = await db.review.groupBy({
    by: ["productId"],
    where: { approved: true, productId: { in: ids } },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return new Map(
    rows.map((r) => [
      r.productId,
      { average: Number(r._avg.rating ?? 0), count: r._count._all },
    ])
  );
}

/** Merge a rating onto each product; unrated products get a zero-count entry
 *  so the card can decide to render nothing rather than a misleading "0.0". */
export function attachRatings<T extends { id: number }>(
  products: T[],
  ratings: Map<number, ProductRating>
): (T & { rating: ProductRating })[] {
  return products.map((p) => ({ ...p, rating: ratings.get(p.id) ?? NO_RATING }));
}

/** Convenience for a single list: load + attach in one call. */
export async function withRatings<T extends { id: number }>(
  db: PrismaClient,
  products: T[]
): Promise<(T & { rating: ProductRating })[]> {
  const ratings = await loadRatings(db, products.map((p) => p.id));
  return attachRatings(products, ratings);
}
