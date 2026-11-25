"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { cardDisplay } from "../../lib/discounts";
import type { StorefrontCard } from "../../lib/storefront";
import ProductImage, { BlurBackdrop } from "../shop/ProductImage";
import Reveal from "../shop/Reveal";
import HomeProductCard, { formatRupee, isOutOfStock } from "./HomeProductCard";

const GRID_LIMIT = 8;

// Admin-written short descriptions look like
//   "💝 Mini Me – Mini Version… ✨ Features: • Custom made… • High-quality…"
// Split that into an intro and up to three bullet points, emoji stripped.
// (Constructor, not a literal: tsconfig targets ES2017, which rejects the
// unicode-property escape in literal form; browsers all support it.)
const EMOJI = new RegExp("[\\p{Extended_Pictographic}\\uFE0F\\u200D]", "gu");
function splitBlurb(text: string | null | undefined, name: string) {
  let clean = (text ?? "").replace(EMOJI, "").replace(/\s+/g, " ").trim();
  // Drop a leading "<Product name> – " so the intro doesn't repeat the heading.
  if (clean.toLowerCase().startsWith(name.toLowerCase())) {
    clean = clean.slice(name.length).replace(/^\s*[–—:-]\s*/, "");
  }
  const [introRaw, ...rest] = clean.split("•");
  const intro = introRaw.replace(/Features:?\s*$/i, "").trim();
  const bullets = rest
    .map((b) => b.replace(/Perfect fo.*$/i, "").trim())
    .filter(Boolean)
    .slice(0, 3);
  return { intro, bullets };
}

// One "shop" section instead of three shelves that repeated the same products:
// category filter chips, a spotlight banner for the featured piece, and a grid
// of large cards for the rest.
export default function CollectionShowcase({ products }: { products: StorefrontCard[] }) {
  const [filter, setFilter] = useState("all");

  // Spotlight: a featured customisable piece if there is one (the studio's
  // strength), else the first featured, else the newest.
  const spotlight =
    products.find((p) => p.featured && p.customizable && !isOutOfStock(p)) ??
    products.find((p) => p.featured) ??
    products[0];

  // Chips only for categories that actually have products in this list.
  const chips = useMemo(() => {
    const m = new Map<string, { name: string; count: number }>();
    for (const p of products) {
      if (!p.category) continue;
      const c = m.get(p.category.slug) ?? { name: p.category.name, count: 0 };
      c.count++;
      m.set(p.category.slug, c);
    }
    return [...m.entries()].map(([slug, v]) => ({ slug, ...v }));
  }, [products]);

  if (!spotlight) return null;

  const showSpotlight = filter === "all" || spotlight.category?.slug === filter;
  const grid = products
    .filter((p) => p.id !== spotlight.id || !showSpotlight)
    .filter((p) => filter === "all" || p.category?.slug === filter)
    .slice(0, GRID_LIMIT);

  const chipClass = (on: boolean) =>
    `rounded-full px-5 py-2.5 text-sm font-semibold transition ${
      on
        ? "bg-slate-900 text-white"
        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-400"
    }`;

  return (
    <section id="shop" className="scroll-mt-20 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <Reveal>
            <h2 className="font-display text-5xl font-semibold tracking-[-0.035em] text-slate-900 sm:text-6xl lg:text-7xl">
              The collection
            </h2>
            <p className="mt-4 max-w-md text-lg text-slate-600">
              Hand-picked best sellers, printed to order. Pick a shelf or browse
              it all.
            </p>
          </Reveal>
          {chips.length > 1 && (
            <Reveal delay={120}>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter products by category">
                <button
                  type="button"
                  aria-pressed={filter === "all"}
                  onClick={() => setFilter("all")}
                  className={chipClass(filter === "all")}
                >
                  All <span className="ml-1 font-mono opacity-60">{products.length}</span>
                </button>
                {chips.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    aria-pressed={filter === c.slug}
                    onClick={() => setFilter(c.slug)}
                    className={chipClass(filter === c.slug)}
                  >
                    {c.name} <span className="ml-1 font-mono opacity-60">{c.count}</span>
                  </button>
                ))}
              </div>
            </Reveal>
          )}
        </div>

        {showSpotlight && (
          <Reveal className="mt-14">
            <Spotlight product={spotlight} />
          </Reveal>
        )}

        {grid.length > 0 && (
          <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {grid.map((p, k) => (
              <Reveal key={p.id} delay={(k % 4) * 70}>
                <HomeProductCard product={p} />
              </Reveal>
            ))}
          </div>
        )}

        <div className="mt-14 flex justify-center">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:ring-slate-400"
          >
            See all products →
          </Link>
        </div>
      </div>
    </section>
  );
}

function Spotlight({ product }: { product: StorefrontCard }) {
  const { price, listPrice, percentOff } = cardDisplay(product);
  const { intro, bullets } = splitBlurb(product.shortDescription || product.description, product.name);
  const img = product.images?.[0]?.url;
  const href = `/products/${product.slug}`;

  return (
    <article className="group relative grid overflow-hidden rounded-[2rem] bg-slate-950 text-white md:grid-cols-[minmax(0,440px)_1fr]">
      <Link href={href} className="relative block overflow-hidden" tabIndex={-1} aria-hidden="true">
        {/* The poster is 2:3 with text baked in — show it whole over a blurred copy of itself. */}
        {img && <BlurBackdrop src={img} className="opacity-60" />}
        <div className="relative p-6">
          <ProductImage
            src={img}
            alt={product.name}
            productId={product.id}
            aspectClass="aspect-[2/3]"
            fit="contain"
            sizes="(max-width: 768px) 100vw, 440px"
            className="bg-transparent transition duration-700 group-hover:scale-[1.03]"
          />
        </div>
        {listPrice != null && percentOff > 0 && (
          <span className="absolute left-4 top-4 rounded-full bg-brand-500 px-3 py-1 font-mono text-xs font-bold text-slate-950">
            −{percentOff}%
          </span>
        )}
      </Link>

      <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-16">
        <p className="font-mono text-xs text-brand-300">
          Editor&apos;s pick{product.category?.name ? ` · ${product.category.name}` : ""}
        </p>
        <h3 className="mt-4 font-display text-5xl font-semibold leading-none tracking-[-0.035em] lg:text-7xl">
          <Link href={href} className="hover:text-brand-200">
            {product.name}
          </Link>
        </h3>
        {intro && <p className="mt-6 line-clamp-4 max-w-lg text-lg text-slate-300">{intro}</p>}
        {bullets.length > 0 && (
          <ul className="mt-6 space-y-2 text-sm text-slate-300">
            {bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="text-brand-400" aria-hidden="true">◆</span>
                {b}
              </li>
            ))}
          </ul>
        )}
        <div className="pt-10">
          <p className="flex items-baseline gap-3">
            <span className="font-mono text-3xl font-bold">
              {price > 0 ? formatRupee(price) : product.price}
            </span>
            {listPrice != null && (
              <span className="font-mono text-slate-500 line-through">{formatRupee(listPrice)}</span>
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={href}
              className="rounded-full bg-brand-500 px-6 py-3.5 font-semibold text-slate-950 transition hover:bg-brand-400 active:scale-[.97]"
            >
              {product.customizable ? "Customise & buy" : "Buy now"}
            </Link>
            <Link
              href={href}
              className="rounded-full bg-white/10 px-6 py-3.5 font-semibold ring-1 ring-white/15 transition hover:bg-white/15 active:scale-[.97]"
            >
              View details
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
