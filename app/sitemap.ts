import type { MetadataRoute } from "next";

import { prisma } from "../lib/prisma";
import { SITE_URL, POLICY_LAST_UPDATED } from "../lib/site";

export const dynamic = "force-dynamic";

// Legal pages change only when a policy is actually revised, which is exactly
// what POLICY_LAST_UPDATED tracks. Previously every route reported
// `new Date()`, i.e. "everything changed just now" on every single fetch —
// which teaches Google to ignore our lastModified signal altogether.
const POLICY_DATE = new Date(POLICY_LAST_UPDATED);

/** Newest updatedAt in a set of rows, or undefined when there are none. */
function newest(rows: { updatedAt: Date | null }[]): Date | undefined {
  const times = rows
    .map((r) => r.updatedAt?.getTime())
    .filter((t): t is number => typeof t === "number");
  return times.length ? new Date(Math.max(...times)) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // One trip for everything the sitemap needs. Each query is individually
  // guarded below so a single failure can't blank the whole file.
  const [categories, products, deities] = await Promise.all([
    // Only categories that actually contain something. Listing empty landings
    // invites Google to crawl thin pages — 3 of the 6 categories currently have
    // no products at all.
    prisma.category
      .findMany({
        where: { products: { some: { deletedAt: null } } },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => []),
    // Soft-deleted rows are excluded so retired products stop being advertised.
    prisma.product
      .findMany({
        where: { deletedAt: null },
        select: { slug: true, updatedAt: true },
      })
      .catch(() => []),
    // `scriptures` is a JSON array on Deity; each entry is reachable at
    // /darshan/<key>/<index>, so the pages are enumerable from it.
    prisma.deity
      .findMany({
        where: { active: true },
        select: { key: true, updatedAt: true, scriptures: true },
      })
      .catch(() => []),
  ]);

  // Catalog-driven pages are only as fresh as the newest product, so report
  // that rather than "now".
  const catalogDate = newest(products);
  const deityDate = newest(deities);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      ...(catalogDate ? { lastModified: catalogDate } : {}),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/search`,
      ...(catalogDate ? { lastModified: catalogDate } : {}),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/smart-idols`,
      ...(deityDate ? { lastModified: deityDate } : {}),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    // No reliable "last changed" signal for these — omitting the field is
    // honest, and better than a timestamp Google will learn to distrust.
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.6 },
    // Linked from the primary nav and the footer, and a plausible landing page
    // for "track my ShilpSmith order" — it was simply missing before.
    { url: `${SITE_URL}/track`, changeFrequency: "monthly", priority: 0.5 },
    {
      url: `${SITE_URL}/terms`,
      lastModified: POLICY_DATE,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: POLICY_DATE,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/shipping-returns`,
      lastModified: POLICY_DATE,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/categories/${c.slug}`,
    ...(c.updatedAt ? { lastModified: c.updatedAt } : {}),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // The main indexable inventory.
  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/products/${p.slug}`,
    ...(p.updatedAt ? { lastModified: p.updatedAt } : {}),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const deityRoutes: MetadataRoute.Sitemap = deities.map((d) => ({
    url: `${SITE_URL}/darshan/${d.key}`,
    ...(d.updatedAt ? { lastModified: d.updatedAt } : {}),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Individual scripture pages — real, indexable devotional content that was
  // never listed. Indexed by position, matching how the route resolves them.
  const scriptureRoutes: MetadataRoute.Sitemap = deities.flatMap((d) => {
    const items = Array.isArray(d.scriptures) ? d.scriptures : [];
    return items.map((_, idx) => ({
      url: `${SITE_URL}/darshan/${d.key}/${idx}`,
      ...(d.updatedAt ? { lastModified: d.updatedAt } : {}),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));
  });

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...productRoutes,
    ...deityRoutes,
    ...scriptureRoutes,
  ];
}
