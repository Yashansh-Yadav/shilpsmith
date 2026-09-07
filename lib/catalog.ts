// lib/catalog.ts
//
// The catalog query behind both /api/products and the server-rendered /search
// page. Extracted so the two can't drift: /search now renders its first page of
// results on the server (previously it fetched on mount, leaving the "Shop"
// landing page — priority 0.9 in the sitemap — empty for anything that doesn't
// run JavaScript), and the API still serves the client-side re-filtering.

import type { Prisma } from "@prisma/client";

import { prisma } from "./prisma";
import { parsePrice } from "./validators";
import { cardAutoPercent } from "./discounts";
import { loadActiveAutomaticDiscounts } from "./discountQuery";
import { loadRatings, NO_RATING, type ProductRating } from "./ratings";

export interface CatalogQuery {
  q?: string;
  category?: string;
  featured?: string;
  customizable?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  limit?: number;
}

const CATALOG_INCLUDE = {
  category: true,
  images: { orderBy: { id: "asc" as const } },
  variants: { orderBy: { createdAt: "asc" as const } },
  // Smart-NFC idols: expose the linked deity so the storefront can show a
  // "View live darshan" link. Only active deities should surface.
  deity: { select: { key: true, nameEn: true, active: true } },
} as const;

type CatalogRow = Prisma.ProductGetPayload<{ include: typeof CATALOG_INCLUDE }>;

export type CatalogProduct = Omit<CatalogRow, "createdAt" | "updatedAt" | "variants"> & {
  createdAt: string;
  updatedAt: string;
  // Decimal can't cross the server→client boundary, and it JSON-serializes to a
  // string over the API. Normalizing to a number here makes both paths identical.
  variants: (Omit<CatalogRow["variants"][number], "priceModifier" | "createdAt" | "updatedAt"> & {
    priceModifier: number;
  })[];
  eventDiscountPercent: number | null;
  rating: ProductRating;
};

export async function searchProducts(
  query: CatalogQuery
): Promise<CatalogProduct[]> {
  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(query.category ? { category: { slug: query.category } } : {}),
    ...(query.featured ? { featured: query.featured === "true" } : {}),
    ...(query.customizable
      ? { customizable: query.customizable === "true" }
      : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" } },
            { shortDescription: { contains: query.q, mode: "insensitive" } },
            { description: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  // Server-side ordering for everything except price (stored as String — we
  // sort numerically in JS below so '900' doesn't outrank '1100').
  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  if (query.sort === "oldest") orderBy = { createdAt: "asc" };
  else if (query.sort === "featured") orderBy = { featured: "desc" };

  let products = await prisma.product.findMany({
    where,
    include: CATALOG_INCLUDE,
    orderBy,
    take: query.limit,
  });

  // Price filter / sort. The legacy `price: String` storage means we can't push
  // these into Postgres without a cast — at current catalog sizes a JS pass is
  // fine. Revisit if the catalog grows to thousands.
  if (
    query.minPrice !== undefined ||
    query.maxPrice !== undefined ||
    query.sort === "priceAsc" ||
    query.sort === "priceDesc"
  ) {
    const withPrice = products.map((p) => ({ p, price: parsePrice(p.price) }));
    let filtered = withPrice;
    if (query.minPrice !== undefined) {
      filtered = filtered.filter((x) => x.price >= query.minPrice!);
    }
    if (query.maxPrice !== undefined) {
      filtered = filtered.filter((x) => x.price <= query.maxPrice!);
    }
    if (query.sort === "priceAsc") filtered.sort((a, b) => a.price - b.price);
    else if (query.sort === "priceDesc") filtered.sort((a, b) => b.price - a.price);
    products = filtered.map((x) => x.p);
  }

  // One roundtrip each for the whole page, never per card.
  const [autoDiscounts, ratings] = await Promise.all([
    loadActiveAutomaticDiscounts(prisma),
    loadRatings(prisma, products.map((p) => p.id)),
  ]);
  const now = new Date();

  return products.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    variants: p.variants.map(({ createdAt, updatedAt, ...v }) => ({
      ...v,
      priceModifier: Number(v.priceModifier),
    })),
    eventDiscountPercent: cardAutoPercent(p, autoDiscounts, now),
    rating: ratings.get(p.id) ?? NO_RATING,
  }));
}
