import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "../../../lib/prisma";
import { ok, handle } from "../../../lib/apiResponse";
import { parseQuery } from "../../../lib/middleware/validateRequest";
import {
  ProductSearchQuerySchema,
  parsePrice,
} from "../../../lib/validators";
import { cardAutoPercent } from "../../../lib/discounts";
import { loadActiveAutomaticDiscounts } from "../../../lib/discountQuery";

export const GET = handle(async (request: NextRequest) => {
  const query = parseQuery(request, ProductSearchQuerySchema);

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

  // Server-side ordering for everything except price (stored as String —
  // we sort numerically in JS below so '900' doesn't outrank '1100').
  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  if (query.sort === "oldest") orderBy = { createdAt: "asc" };
  else if (query.sort === "featured") orderBy = { featured: "desc" };
  // priceAsc / priceDesc handled in JS post-fetch.

  let products = await prisma.product.findMany({
    where,
    include: {
      category: true,
      images: { orderBy: { id: "asc" } },
      variants: { orderBy: { createdAt: "asc" } },
      // Smart-NFC idols: expose the linked deity so the storefront can show a
      // "View live darshan" link. Only active deities should surface.
      deity: { select: { key: true, nameEn: true, active: true } },
    },
    orderBy,
    take: query.limit,
  });

  // Price filter / sort. The legacy `price: String` storage means we can't
  // push these into Postgres without a cast — at current catalog sizes a JS
  // pass is fine. Revisit if the catalog grows to thousands.
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
    if (query.sort === "priceAsc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (query.sort === "priceDesc") {
      filtered.sort((a, b) => b.price - a.price);
    }
    products = filtered.map((x) => x.p);
  }

  // Advertise any applicable automatic event discount on each product card.
  const autoDiscounts = await loadActiveAutomaticDiscounts(prisma);
  const now = new Date();
  const decorated = products.map((p) => ({
    ...p,
    eventDiscountPercent: cardAutoPercent(p, autoDiscounts, now),
  }));

  return ok(decorated);
});
