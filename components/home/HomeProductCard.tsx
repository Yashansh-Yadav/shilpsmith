import Link from "next/link";

import { cardDisplay } from "../../lib/discounts";
import type { StorefrontCard } from "../../lib/storefront";
import ProductImage from "../shop/ProductImage";

export function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function isOutOfStock(p: Pick<StorefrontCard, "stock" | "stockStatus">) {
  return p.stockStatus === "out-of-stock" || p.stock === 0;
}

// Large homepage product card. Product images are 2:3 posters with text baked
// in, so the frame is 2:3 too — nothing gets cropped. Hover lifts the image and
// slides up a "View product" bar; the whole card is one link to the product
// page (variants / customisation are chosen there).
export default function HomeProductCard({ product }: { product: StorefrontCard }) {
  const { price, listPrice, percentOff } = cardDisplay(product);
  const outOfStock = isOutOfStock(product);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block rounded-[1.75rem] outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-4"
    >
      <div className="relative overflow-hidden rounded-[1.75rem] bg-slate-200">
        <ProductImage
          src={product.images?.[0]?.url}
          alt={product.name}
          productId={product.id}
          aspectClass="aspect-[2/3]"
          className={`transition duration-700 group-hover:scale-[1.04] ${
            outOfStock ? "opacity-60 grayscale" : ""
          }`}
        />

        {outOfStock ? (
          <span className="absolute left-3 top-3 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
            Out of stock
          </span>
        ) : (
          listPrice != null &&
          percentOff > 0 && (
            <span className="absolute left-3 top-3 rounded-full bg-brand-500 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-950">
              −{percentOff}%
            </span>
          )
        )}
        {product.customizable && (
          <span className="absolute right-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-900">
            Customisable
          </span>
        )}

        <div className="card-quick absolute inset-x-3 bottom-3 flex gap-2">
          <span className="flex-1 rounded-full bg-slate-950 py-3 text-center text-sm font-semibold text-white">
            View product
          </span>
          <span
            aria-hidden="true"
            className="grid w-12 place-items-center rounded-full bg-white text-slate-900"
          >
            →
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          {product.category?.name && (
            <p className="text-sm text-slate-500">{product.category.name}</p>
          )}
          <h3 className="mt-1 font-display text-xl font-semibold leading-tight tracking-tight text-slate-900">
            {product.name}
          </h3>
        </div>
        {/* Hidden with no approved reviews: "0.0 ★" reads as a bad score. */}
        {product.rating && product.rating.count > 0 && (
          <span
            title={`${product.rating.average.toFixed(1)} out of 5 · ${product.rating.count} review${
              product.rating.count > 1 ? "s" : ""
            }`}
            className="mt-1 shrink-0 rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700"
          >
            ★ {product.rating.average.toFixed(1)}
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
