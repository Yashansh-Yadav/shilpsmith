// app/categories/[slug]/page.tsx
//
// Server-rendered category landing. Three things changed here at once:
//
//  1. Products are queried on the server, so the catalog is in the initial HTML.
//     Google no longer has to wait for its JavaScript rendering pass, and AI
//     crawlers (which don't run JS at all) can finally see what we sell.
//  2. The category is resolved from the database instead of a hardcoded map of
//     four slugs. That map was missing "spiritual-artistic" and
//     "jewelry-fashion", so those pages passed `category: undefined` to the grid
//     and listed the ENTIRE catalog instead of the category — while the sitemap
//     was happily pointing Google at both of them.
//  3. Unknown slugs now 404 instead of rendering a page with a title invented
//     from the URL, which was a soft-404 machine.

import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { prisma } from "../../../lib/prisma";
import ProductGrid from "../../../components/ProductGrid";
import { CartButton } from "../../../components/shop/CartSheet";
import type { StorefrontProduct } from "../../../components/shop/ProductCard";
import { cardAutoPercent } from "../../../lib/discounts";
import { loadActiveAutomaticDiscounts } from "../../../lib/discountQuery";
import { loadRatings, NO_RATING } from "../../../lib/ratings";
import { SITE_NAME } from "../../../lib/site";

// Same 1-minute window as /products/[slug] and /api/storefront: admin edits
// surface quickly without re-querying Neon on every hit.
export const revalidate = 60;

// Wrapped in cache() so generateMetadata and the page body share one query per
// request instead of hitting Neon twice for the same category.
const getCategory = cache(async (slug: string) =>
  prisma.category.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      products: {
        where: { deletedAt: null },
        select: {
          id: true,
          categoryId: true,
          name: true,
          slug: true,
          shortDescription: true,
          price: true,
          discountPrice: true,
          customizable: true,
          featured: true,
          stock: true,
          stockStatus: true,
          modelUrl: true,
          images: { select: { url: true }, orderBy: { id: "asc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return { title: "Category not found" };

  const description =
    category.description?.trim() ||
    `Browse ${category.name.toLowerCase()} — premium 3D printed pieces from ${SITE_NAME}, made to order in India.`;

  return {
    title: category.name,
    description,
    alternates: { canonical: `/categories/${category.slug}` },
    openGraph: { title: `${category.name} · ${SITE_NAME}`, description },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const [autoDiscounts, ratings] = await Promise.all([
    loadActiveAutomaticDiscounts(prisma),
    loadRatings(prisma, category.products.map((p) => p.id)),
  ]);

  const now = new Date();
  const products: StorefrontProduct[] = category.products.map((p) => ({
    ...p,
    eventDiscountPercent: cardAutoPercent(p, autoDiscounts, now),
    rating: ratings.get(p.id) ?? NO_RATING,
    category: { name: category.name, slug: category.slug },
  }));

  return (
    <main className="min-h-screen bg-slate-50 py-10 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500"
          >
            <Link href="/" className="shrink-0 transition hover:text-slate-900">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            <Link
              href="/search"
              className="shrink-0 transition hover:text-slate-900"
            >
              Shop
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            <span className="truncate font-medium text-slate-900">
              {category.name}
            </span>
          </nav>
          <CartButton />
        </div>

        <div className="mb-10">
          {/* The real category name from the database — the old title was
              title-cased from the URL slug, so "Home & Decor" rendered as
              "Home Decor". */}
          <h1 className="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            {category.name}
          </h1>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate-600">
            {category.description?.trim() ||
              "Explore premium 3D printed products, made to order."}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {products.length === 0
              ? "No products yet"
              : `${products.length} product${products.length > 1 ? "s" : ""}`}
          </p>
        </div>

        <ProductGrid
          products={products}
          emptyMessage={`We're still building out ${category.name.toLowerCase()}. Browse the full catalog in the meantime.`}
        />
      </div>
    </main>
  );
}
