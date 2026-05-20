// components/ProductGrid.tsx

"use client";

import { useEffect, useState } from "react";

import ProductModal from "./ProductModal";

export default function ProductGrid({
  category
}: {
  category?: string;
}) {
  const [products, setProducts] = useState<
    any[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [selectedProduct, setSelectedProduct] =
    useState<any>(null);

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

  return (
    <>
      {/* RESPONSIVE GRID */}
      <div
        className="
          grid
          grid-cols-2
          lg:grid-cols-4
          gap-4
          lg:gap-8
        "
      >
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() =>
              setSelectedProduct(product)
            }
            className="
              bg-white
              rounded-2xl
              overflow-hidden
              border
              border-slate-100
              hover:shadow-2xl
              transition-all
              text-left
            "
          >
            <img
              src={ product.images?.[0]?.url ||
                    "/placeholder.png"}
              alt={product.name}
              className="
                w-full
                h-40
                sm:h-52
                lg:h-72
                object-cover
              "
            />

            <div className="p-3 lg:p-5">
              <h3
                className="
                  font-bold
                  text-sm
                  lg:text-lg
                  line-clamp-1
                "
              >
                {product.name}
              </h3>

              <p
                className="
                  text-slate-500
                  text-xs
                  lg:text-sm
                  mt-2
                  line-clamp-2
                "
              >
                {product.description}
              </p>

              <p
                className="
                  text-brand-600
                  font-bold
                  mt-3
                  text-sm
                  lg:text-lg
                "
              >
                {product.price}
              </p>
            </div>
          </button>
        ))}
      </div>

      <ProductModal
        product={selectedProduct}
        onClose={() =>
          setSelectedProduct(null)
        }
      />
    </>
  );
}