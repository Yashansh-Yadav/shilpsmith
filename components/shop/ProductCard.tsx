"use client";

import Link from "next/link";
import { Box, Star } from "lucide-react";

import { cardDisplay } from "../../lib/discounts";
import ProductImage from "./ProductImage";

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
  //
  // Same look as the homepage cards (components/home/HomeProductCard): images
  // are 2:3 posters with text baked in, so the frame is 2:3 and nothing crops.
  return (
    <Link
      href={`/products/${product.slug}`}
      className={`group block rounded-[1.75rem] text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-4 ${
        size === "compact" ? "h-full" : ""
      }`}
    >
      <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-200">
        <ProductImage
          src={product.images?.[0]?.url}
          alt={product.name}
          productId={product.id}
          aspectClass={size === "compact" ? "aspect-square" : "aspect-[2/3]"}
          className={`transition duration-700 group-hover:scale-[1.04] ${
            outOfStock ? "opacity-60 grayscale" : ""
          }`}
        />

        {/* Tags stack in one corner so they never collide on narrow 2-column
            phone grids. */}
        <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5 sm:left-3 sm:top-3">
          {outOfStock ? (
            <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white">
              Out of stock
            </span>
          ) : (
            listPrice != null &&
            pct > 0 && (
              <span className="rounded-full bg-brand-500 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-950">
                −{pct}%
              </span>
            )
          )}
          {product.customizable && (
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-900">
              Customisable
            </span>
          )}
          {product.modelUrl && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/85 px-2.5 py-1 text-[11px] font-semibold text-white">
              <Box className="h-3 w-3" strokeWidth={2.5} />
              3D
            </span>
          )}
        </div>

        <div className="card-quick absolute inset-x-3 bottom-3 flex gap-2">
          <span className="flex-1 rounded-full bg-slate-950 py-3 text-center text-sm font-semibold text-white">
            View product
          </span>
          <span aria-hidden="true" className="grid w-12 place-items-center rounded-full bg-white text-slate-900">
            →
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          {product.category?.name && (
            <p className="text-sm text-slate-500">{product.category.name}</p>
          )}
          <h3 className="mt-1 line-clamp-2 font-display text-lg font-semibold leading-tight tracking-tight text-slate-900 sm:text-xl">
            {product.name}
          </h3>
        </div>
        {/* Hidden entirely when there are no approved reviews: "0.0 ★" reads
            as a bad score, not an absent one. */}
        {product.rating && product.rating.count > 0 && (
          <span
            title={`${product.rating.average.toFixed(1)} out of 5 · ${
              product.rating.count
            } review${product.rating.count > 1 ? "s" : ""}`}
            className="mt-1 inline-flex shrink-0 select-none items-center gap-0.5 rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700"
          >
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {product.rating.average.toFixed(1)}
          </span>
        )}
      </div>
      <p className="mt-2 flex items-baseline gap-2 px-1">
        <span className="font-mono text-lg font-bold text-slate-900">
          {price > 0 ? formatRupee(price) : product.price}
        </span>
        {listPrice != null && (
          <span className="font-mono text-sm text-slate-400 line-through">
            {formatRupee(listPrice)}
          </span>
        )}
      </p>
    </Link>
  );
}
