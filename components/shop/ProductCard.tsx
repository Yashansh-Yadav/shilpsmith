"use client";

import { Box } from "lucide-react";

import { parsePrice } from "../../lib/validators";
import ProductImage from "./ProductImage";

export interface StorefrontProduct {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  price: string;
  discountPrice?: string | null;
  customizable?: boolean;
  featured?: boolean;
  createdAt?: string | Date;
  images?: { url: string }[];
  variants?: unknown[];
  modelUrl?: string | null;
  stockStatus?: string;
  category?: { name: string; slug: string };
}

interface Props {
  product: StorefrontProduct;
  onSelect: (product: StorefrontProduct) => void;
  size?: "default" | "compact";
}

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function isNew(createdAt?: string | Date): boolean {
  if (!createdAt) return false;
  const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return Date.now() - date.getTime() < 30 * 24 * 60 * 60 * 1000;
}

export default function ProductCard({ product, onSelect, size = "default" }: Props) {
  const base = parsePrice(product.price);
  const sale =
    product.discountPrice && parsePrice(product.discountPrice) < base
      ? parsePrice(product.discountPrice)
      : null;

  const badges: { label: string; cls: string }[] = [];
  if (isNew(product.createdAt)) {
    badges.push({
      label: "NEW",
      cls: "bg-brand-600 text-white",
    });
  }
  if (product.featured) {
    badges.push({
      label: "FEATURED",
      cls: "bg-slate-900 text-white",
    });
  }
  if (sale != null) {
    const pct = Math.round(((base - sale) / base) * 100);
    badges.push({
      label: `-${pct}%`,
      cls: "bg-amber-500 text-white",
    });
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
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
          className="transition duration-500 group-hover:scale-[1.04]"
        />

        {/* Badges */}
        {badges.length > 0 && (
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1">
            {badges.map((b) => (
              <span
                key={b.label}
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm ${b.cls}`}
              >
                {b.label}
              </span>
            ))}
          </div>
        )}

        {/* 3D indicator */}
        {product.modelUrl && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-900 shadow-sm backdrop-blur">
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

        <div className="mt-3 flex items-baseline gap-2">
          {sale != null ? (
            <>
              <span className="font-spec text-sm font-bold text-brand-700 sm:text-base">
                {formatRupee(sale)}
              </span>
              <span className="font-spec text-[11px] text-slate-400 line-through">
                {formatRupee(base)}
              </span>
            </>
          ) : (
            <span className="font-spec text-sm font-bold text-slate-900 sm:text-base">
              {Number.isFinite(base) && base > 0 ? formatRupee(base) : product.price}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
