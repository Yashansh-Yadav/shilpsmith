"use client";

import Link from "next/link";
import { Box, Star } from "lucide-react";

import { cardDisplay } from "../../lib/discounts";
import ProductImage from "./ProductImage";
import DiscountRibbon from "./DiscountRibbon";

export interface StorefrontProduct {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  price: string;
  discountPrice?: string | null;
  /** Best advertisable automatic event discount (%), attached by the API. */
  eventDiscountPercent?: number | null;
  customizable?: boolean;
  featured?: boolean;
  createdAt?: string | Date;
  images?: { url: string }[];
  variants?: unknown[];
  modelUrl?: string | null;
  stock?: number;
  stockStatus?: string;
  category?: { name: string; slug: string };
  deity?: { key: string; nameEn: string; active: boolean } | null;
  /** Approved-review aggregate, attached by the API via lib/ratings.ts. */
  rating?: { average: number; count: number } | null;
}

interface Props {
  product: StorefrontProduct;
  size?: "default" | "compact";
}

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function ProductCard({ product, size = "default" }: Props) {
  // cardDisplay combines the product's own sale price with any advertisable
  // automatic event discount — one place decides what the card shows, in step
  // with what checkout charges.
  const { price, listPrice, percentOff: pct } = cardDisplay(product);

  // Out of stock is authoritative on the count (0), with stockStatus as an
  // explicit admin override — matches what the order route enforces, so the
  // badge never disagrees with what checkout allows.
  const outOfStock =
    product.stockStatus === "out-of-stock" || product.stock === 0;

  // A real link, not a button: the product page is a URL customers should be
  // able to open in a new tab, share, and have Google index.
  return (
    <Link
      href={`/products/${product.slug}`}
      className={`group flex w-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:border-slate-200 hover:shadow-lift ${
        size === "compact" ? "h-full" : ""
      }`}
    >
      <div className="relative overflow-hidden">
        {/* Image OR branded "dropping soon" placeholder when missing */}
        <ProductImage
          src={product.images?.[0]?.url}
          alt={product.name}
          productId={product.id}
          aspectClass={size === "compact" ? "aspect-square" : "aspect-[4/5]"}
          className={`transition duration-500 group-hover:scale-[1.04] ${
            outOfStock ? "opacity-60 grayscale" : ""
          }`}
        />

        {/* Out-of-stock overlay — a soft veil + centred pill so it reads as
            deliberate rather than broken. Suppresses the sale ribbon below. */}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/10">
            <span className="rounded-full bg-slate-900/85 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur">
              Out of stock
            </span>
          </div>
        )}

        {/* Discount ribbon — top-right, only when in stock and genuinely on sale. */}
        {!outOfStock && listPrice != null && pct > 0 && (
          <DiscountRibbon percent={pct} />
        )}

        {/* 3D indicator — top-left, so it never collides with the ribbon. */}
        {product.modelUrl && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-900 shadow-sm backdrop-blur">
            <Box className="h-3 w-3" strokeWidth={2.5} />
            3D
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        {product.category?.name && (
          <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            {product.category.name}
          </p>
        )}
        <h3 className="line-clamp-1 text-sm font-bold text-slate-900">
          {product.name}
        </h3>
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">
          {product.shortDescription || product.description}
        </p>

        <div className="mt-auto flex items-baseline gap-2 pt-3">
          {listPrice != null ? (
            <>
              <span className="font-spec text-sm font-bold text-brand-700 sm:text-base">
                {formatRupee(price)}
              </span>
              <span className="font-spec text-[11px] text-slate-400 line-through">
                {formatRupee(listPrice)}
              </span>
            </>
          ) : (
            <span className="font-spec text-sm font-bold text-slate-900 sm:text-base">
              {price > 0 ? formatRupee(price) : product.price}
            </span>
          )}

          {/* Rating badge — shares the price row so it costs no card height,
              pinned right via ml-auto. Hidden entirely when there are no
              approved reviews: "0.0 ★" reads as a bad score, not an absent one.
              Only the average is shown; the count would wrap the row on a
              2-column mobile grid, so it lives in the tooltip instead. */}
          {product.rating && product.rating.count > 0 && (
            <span
              title={`${product.rating.average.toFixed(1)} out of 5 · ${
                product.rating.count
              } review${product.rating.count > 1 ? "s" : ""}`}
              className="ml-auto inline-flex shrink-0 select-none items-center gap-0.5 self-center whitespace-nowrap rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700"
            >
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {product.rating.average.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
