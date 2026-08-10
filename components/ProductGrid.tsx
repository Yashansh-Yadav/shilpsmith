// components/ProductGrid.tsx
//
// Presentational grid of ProductCards. Deliberately NOT a client component and
// deliberately does no fetching of its own: it used to load products in a
// useEffect, which meant category landings shipped an empty page to crawlers and
// AI agents and only filled in after JavaScript ran. The page now queries the
// database and passes products straight in, so the catalog is in the server HTML.

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
      <div className="rounded-3xl bg-white p-12 text-center text-slate-500 shadow-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-8">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
