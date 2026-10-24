// components/ProductGrid.tsx
//
// Presentational grid of ProductCards. Deliberately NOT a client component and
// deliberately does no fetching of its own: it used to load products in a
// useEffect, which meant category landings shipped an empty page to crawlers and
// AI agents and only filled in after JavaScript ran. The page now queries the
// database and passes products straight in, so the catalog is in the server HTML.

import Link from "next/link";

import ProductCard, { type StorefrontProduct } from "./shop/ProductCard";

export default function ProductGrid({
  products,
  emptyMessage = "Nothing in this category yet — check back soon.",
}: {
  products: StorefrontProduct[];
  emptyMessage?: string;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-[1.75rem] bg-white px-6 py-16 text-center ring-1 ring-slate-200/70">
        <p className="font-display text-3xl font-semibold tracking-[-0.03em] text-slate-900">
          Coming soon
        </p>
        <p className="mx-auto mt-3 max-w-md text-slate-600">{emptyMessage}</p>
        <Link
          href="/search"
          className="mt-8 inline-flex rounded-full bg-slate-900 px-7 py-4 font-semibold text-white transition hover:bg-slate-800 active:scale-[.97]"
        >
          Browse the catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
