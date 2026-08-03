// components/ProductGrid.tsx

"use client";

import { useEffect, useState } from "react";

import ProductCard, {
  type StorefrontProduct,
} from "./shop/ProductCard";

// Category-landing grid. Cards are the shared ProductCard, which links straight
// to /products/<slug> — this used to render its own markup and open a modal,
// which meant the category pages showed a different (and stale) card design.
export default function ProductGrid({
  category
}: {
  category?: string;
}) {
  const [products, setProducts] = useState<
    StorefrontProduct[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);

        let url = "/api/products";

        if (category) {
          url += `?category=${category}`;
        }

        const response = await fetch(url);
        const body = await response.json();

        if (response.ok && body?.success) {
          setProducts(body.data);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.log(error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [category]);

  if (loading) {
    return (
      <div className="text-center py-20">
        Loading products...
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-12 text-center text-slate-500 shadow-sm">
        Nothing in this category yet — check back soon.
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
