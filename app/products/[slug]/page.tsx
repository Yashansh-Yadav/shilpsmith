// app/products/[slug]/page.tsx
//
// Dedicated product detail page — replaces the old ProductModal. Rendered on
// the server so the catalog is crawlable (canonical URL, OG tags, Product +
// AggregateRating JSON-LD) and so the price/stock/rating a customer sees comes
// straight from the database instead of a client fetch.

import type { Metadata } from "next";
import { cache, Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { prisma } from "../../../lib/prisma";
import { cardAutoPercent, cardDisplay } from "../../../lib/discounts";
import { loadActiveAutomaticDiscounts } from "../../../lib/discountQuery";
import { getShippingConfig } from "../../../lib/settings";
import type { CustomFieldsConfig } from "../../../lib/customization";
import { SITE_NAME, SITE_LEGAL_NAME, absoluteUrl } from "../../../lib/site";
import { CartButton } from "../../../components/shop/CartSheet";
import ProductCarousel from "../../../components/shop/ProductCarousel";
import ProductDetail, {
  type ProductDetailData,
} from "../../../components/shop/ProductDetail";
import type { StorefrontProduct } from "../../../components/shop/ProductCard";
import ReviewSection from "../../../components/shop/ReviewSection";
import SectionHeader from "../../../components/shop/SectionHeader";

// Stock and prices change; a 1-minute window keeps Neon quiet without letting
// the page drift far from the catalog. Same trade-off as /api/storefront.
export const revalidate = 60;

const PRODUCT_INCLUDE = {
  category: { select: { name: true, slug: true } },
  images: { orderBy: { id: "asc" } },
  variants: { orderBy: { createdAt: "asc" } },
  deity: { select: { key: true, nameEn: true, active: true } },
} as const;

// generateMetadata and the page body both need the product. React's cache()
// collapses that into a single query per request.
const getProduct = cache(async (slug: string) =>
  prisma.product.findFirst({
    where: { slug, deletedAt: null },
    include: PRODUCT_INCLUDE,
  })
);

/** Rich-text descriptions are HTML; meta tags need plain text. */
function toPlainText(html: string, max = 300): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return { title: "Product not found", robots: { index: false, follow: true } };
  }

  const description =
    product.shortDescription?.trim() || toPlainText(product.description);
  const image = product.images[0]?.url;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      url: absoluteUrl(`/products/${product.slug}`),
      siteName: SITE_NAME,
      title: product.name,
      description,
      ...(image ? { images: [{ url: image, alt: product.name }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // ONE database round for everything above the fold. Neon's pooler costs
  // ~0.5–1s per roundtrip, so awaiting the product first and *then* firing the
  // review queries (which is the obvious way to write this) doubles the time to
  // first paint. Filtering reviews by the `product: { slug }` relation instead
  // of a productId we don't have yet is what keeps it to a single round.
  // Related products genuinely need the resolved categoryId, so they stream in
  // separately below rather than holding up the buy panel.
  const [product, autoDiscounts, shipping, reviews, ratingAgg, byStar] =
    await Promise.all([
      getProduct(slug),
      loadActiveAutomaticDiscounts(prisma),
      // The shipping promise under the price must match what checkout charges.
      getShippingConfig(),
      prisma.review.findMany({
        where: { product: { slug }, approved: true },
        select: {
          id: true,
          rating: true,
          title: true,
          comment: true,
          customerName: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.review.aggregate({
        where: { product: { slug }, approved: true },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      prisma.review.groupBy({
        by: ["rating"],
        where: { product: { slug }, approved: true },
        _count: { _all: true },
      }),
    ]);

  if (!product) notFound();

  const now = new Date();
  const eventDiscountPercent = cardAutoPercent(product, autoDiscounts, now);

  // Prisma types don't survive the server→client boundary: Decimal and Date
  // both need flattening before they reach ProductDetail.
  const detail: ProductDetailData = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shortDescription: product.shortDescription,
    description: product.description,
    price: product.price,
    discountPrice: product.discountPrice,
    eventDiscountPercent,
    customizable: product.customizable,
    stock: product.stock,
    stockStatus: product.stockStatus,
    lowStockThreshold: product.lowStockThreshold,
    modelUrl: product.modelUrl,
    // Prisma types this as JsonValue; the stored shape is the customization
    // config the admin builder writes (validated by CustomFieldsSchema).
    customFields: (product.customFields ?? null) as CustomFieldsConfig | null,
    category: product.category,
    images: product.images.map((i) => ({ url: i.url })),
    variants: product.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      priceModifier: Number(v.priceModifier),
      stock: v.stock,
    })),
    deity: product.deity,
  };

  const rating = {
    average: Number(ratingAgg._avg.rating ?? 0),
    count: ratingAgg._count._all,
  };
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of byStar) distribution[row.rating] = row._count._all;

  const { price: offerPrice } = cardDisplay({ ...product, eventDiscountPercent });
  const inStock =
    product.stockStatus !== "out-of-stock" && product.stock !== 0;
  const url = absoluteUrl(`/products/${product.slug}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${url}#product`,
        name: product.name,
        description:
          product.shortDescription?.trim() || toPlainText(product.description),
        sku: product.slug,
        url,
        ...(product.images.length
          ? { image: product.images.map((i) => i.url) }
          : {}),
        ...(product.category ? { category: product.category.name } : {}),
        brand: { "@type": "Brand", name: SITE_LEGAL_NAME },
        offers: {
          "@type": "Offer",
          url,
          priceCurrency: "INR",
          price: offerPrice,
          availability: inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        },
        // Google rejects an aggregateRating with zero reviews — only emit it
        // once there's something real to aggregate.
        ...(rating.count > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: Number(rating.average.toFixed(1)),
                reviewCount: rating.count,
              },
            }
          : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          {
            "@type": "ListItem",
            position: 2,
            name: "Shop",
            item: absoluteUrl("/search"),
          },
          ...(product.category
            ? [
                {
                  "@type": "ListItem",
                  position: 3,
                  name: product.category.name,
                  item: absoluteUrl(`/categories/${product.category.slug}`),
                },
              ]
            : []),
          {
            "@type": "ListItem",
            position: product.category ? 4 : 3,
            name: product.name,
            item: url,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {/* Breadcrumb + cart access (SiteHeader has no cart button of its own) */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-1.5 text-sm text-slate-500"
          >
            <Link href="/" className="transition hover:text-slate-900">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            <Link href="/search" className="transition hover:text-slate-900">
              Shop
            </Link>
            {product.category && (
              <>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                <Link
                  href={`/categories/${product.category.slug}`}
                  className="truncate transition hover:text-slate-900"
                >
                  {product.category.name}
                </Link>
              </>
            )}
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
            <span className="truncate font-medium text-slate-900">
              {product.name}
            </span>
          </nav>
          <CartButton />
        </div>

        <ProductDetail product={detail} rating={rating} shipping={shipping} />

        <section id="reviews" className="mt-14 scroll-mt-24 border-t border-slate-100 pt-10">
          <ReviewSection
            productId={product.id}
            initialReviews={reviews.map((r) => ({
              ...r,
              createdAt: r.createdAt.toISOString(),
            }))}
            initialSummary={rating}
            initialDistribution={distribution}
          />
        </section>

        {/* Below the fold and needs its own query — stream it in rather than
            making the buy panel wait on a second Neon roundtrip. */}
        <Suspense fallback={<RelatedSkeleton />}>
          <RelatedShelf
            productId={product.id}
            categoryId={product.categoryId}
            categoryName={product.category?.name ?? null}
            categorySlug={product.category?.slug ?? null}
          />
        </Suspense>
      </div>
    </>
  );
}

async function RelatedShelf({
  productId,
  categoryId,
  categoryName,
  categorySlug,
}: {
  productId: number;
  categoryId: number;
  categoryName: string | null;
  categorySlug: string | null;
}) {
  const [related, autoDiscounts] = await Promise.all([
    prisma.product.findMany({
      where: { deletedAt: null, categoryId, id: { not: productId } },
      include: {
        category: { select: { name: true, slug: true } },
        images: { orderBy: { id: "asc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    loadActiveAutomaticDiscounts(prisma),
  ]);

  if (related.length === 0) return null;

  const now = new Date();
  const products: StorefrontProduct[] = related.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    eventDiscountPercent: cardAutoPercent(p, autoDiscounts, now),
  }));

  return (
    <section className="mt-14 border-t border-slate-100 pt-10">
      <SectionHeader
        eyebrow="You might also like"
        title={`More from ${categoryName ?? "the catalog"}`}
        href={categorySlug ? `/categories/${categorySlug}` : "/search"}
        ctaLabel="View all"
      />
      <ProductCarousel products={products} />
    </section>
  );
}

function RelatedSkeleton() {
  return (
    <section className="mt-14 border-t border-slate-100 pt-10">
      <div className="mb-8 h-9 w-72 animate-pulse rounded-xl bg-slate-100" />
      <div className="flex gap-4 sm:gap-5 lg:gap-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-64 w-[180px] flex-none animate-pulse rounded-2xl bg-slate-100 sm:w-[200px] lg:w-[220px]"
          />
        ))}
      </div>
    </section>
  );
}
