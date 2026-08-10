// app/search/page.tsx
//
// Server-rendered shop / search landing. "Shop" in the primary nav points here
// and the sitemap gives it priority 0.9, but it used to fetch its results on
// mount — so the most important listing page on the site shipped empty HTML.
// The first page of results is now rendered on the server; the client component
// takes over for filtering and typing.

import type { Metadata } from "next";

import { prisma } from "../../lib/prisma";
import { searchProducts } from "../../lib/catalog";
import SearchClient from "../../components/search/SearchClient";
import { SITE_NAME } from "../../lib/site";

export const revalidate = 60;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? undefined;

const num = (v: string | string[] | undefined) => {
  const n = Number(one(v));
  return Number.isFinite(n) ? n : undefined;
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const q = one(sp.q);
  // Filter and query permutations are effectively infinite. Let crawlers follow
  // the product links out of them, but keep only the bare /search page in the
  // index — otherwise we spend crawl budget on near-duplicate listings.
  const filtered = Boolean(
    q || sp.category || sp.customizable || sp.minPrice || sp.maxPrice || sp.sort
  );

  return {
    title: q ? `Search: ${q}` : "Shop all products",
    description: `Browse premium 3D printed gifts, decor and custom pieces from ${SITE_NAME}. Filter by category, price and customization.`,
    alternates: { canonical: "/search" },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const [results, categories] = await Promise.all([
    searchProducts({
      q: one(sp.q),
      category: one(sp.category),
      customizable: one(sp.customizable),
      sort: one(sp.sort) ?? "newest",
      minPrice: num(sp.minPrice),
      maxPrice: num(sp.maxPrice),
    }),
    prisma.category.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <SearchClient initialResults={results} initialCategories={categories} />;
}
