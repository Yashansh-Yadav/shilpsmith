// components/ProductModal.tsx

"use client";

import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Box, MessageCircle, ShoppingBag, X } from "lucide-react";

import {
  priceFromProduct,
  useCartStore,
} from "../lib/store/cart";
import VariantSelector, {
  type VariantSummary,
} from "./shop/VariantSelector";
import CustomizationForm, {
  customizationToRecord,
  type CustomizationValues,
} from "./shop/CustomizationForm";
import ReviewSection from "./shop/ReviewSection";
import ProductImage from "./shop/ProductImage";

// Three.js is heavy (~500kB). Only load it when the user opens a product that
// actually has a model. ssr:false because three.js doesn't run on the server.
const ThreeDViewer = dynamic(() => import("./shop/ThreeDViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
      Loading 3D viewer…
    </div>
  ),
});

type Props = {
  product: any;
  onClose: () => void;
};

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function ProductModal({ product, onClose }: Props) {
  const add = useCartStore((s) => s.add);
  const setOpen = useCartStore((s) => s.setOpen);

  const [variants, setVariants] = useState<VariantSummary[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [customization, setCustomization] = useState<CustomizationValues>({});
  const [show3D, setShow3D] = useState(false);

  // Reset state every time a different product is opened.
  useEffect(() => {
    setSelectedVariantId(null);
    setCustomization({});
    setShow3D(false);
    setVariants(
      Array.isArray(product?.variants) ? (product.variants as VariantSummary[]) : []
    );
  }, [product?.id, product?.variants]);

  // If the product object didn't ship with variants (e.g. older API response),
  // fetch them lazily so the selector still works.
  useEffect(() => {
    if (!product?.id) return;
    if (variants.length > 0) return;
    if (Array.isArray(product?.variants)) return;
    let cancelled = false;
    fetch(`/api/products/${product.id}/variants`)
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        if (body?.success && Array.isArray(body.data)) {
          setVariants(body.data as VariantSummary[]);
        }
      })
      .catch(() => {
        /* swallow — variants are optional */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  const basePrice = useMemo(
    () => (product ? priceFromProduct(product) : 0),
    [product]
  );
  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? null,
    [variants, selectedVariantId]
  );
  const unitPrice = useMemo(
    () => basePrice + Number(selectedVariant?.priceModifier ?? 0),
    [basePrice, selectedVariant]
  );

  if (!product) return null;

  const customizable =
    product.customizable === true || product.customizable === 1;

  const hasVariants = variants.length > 0;
  const variantOutOfStock =
    hasVariants && selectedVariant != null && selectedVariant.stock === 0;
  const requiresVariant = hasVariants && selectedVariantId == null;

  function handleAddToCart() {
    if (requiresVariant) {
      toast.error("Pick a variant first");
      return;
    }
    if (variantOutOfStock) {
      toast.error("That variant is out of stock");
      return;
    }

    const cust = customizable ? customizationToRecord(customization) : undefined;

    add({
      productId: product.id,
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      name: product.name,
      slug: product.slug,
      imageUrl: product.images?.[0]?.url ?? null,
      unitPrice,
      customization: cust,
    });

    toast.success(`Added ${product.name} to cart`);
    onClose();
    setOpen(true);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-3 backdrop-blur-md lg:p-6">
      <div className="relative w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-4xl bg-white shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Close product details"
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg backdrop-blur transition hover:bg-white hover:text-slate-900"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid lg:grid-cols-2">
          {/* IMAGE / 3D VIEWER */}
          <div className="relative">
            {show3D && product.modelUrl ? (
              <div className="p-3 lg:p-4">
                <ThreeDViewer url={product.modelUrl} height={420} />
              </div>
            ) : (
              <ProductImage
                src={product.images?.[0]?.url}
                alt={product.name}
                productId={product.id}
                aspectClass="aspect-square lg:aspect-auto lg:h-full"
                caption={product.images?.[0]?.url ? undefined : product.name}
                className="lg:rounded-l-4xl"
              />
            )}
            {product.modelUrl && (
              <button
                type="button"
                onClick={() => setShow3D((v) => !v)}
                className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-lg backdrop-blur transition hover:bg-white"
              >
                <Box className="h-3.5 w-3.5" strokeWidth={2.5} />
                {show3D ? "Show photo" : "View in 3D"}
              </button>
            )}
          </div>

          {/* DETAILS */}
          <div className="flex flex-col gap-6 p-5 sm:p-8 lg:p-10">
            <header>
              {product.category?.name && (
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-700">
                  {product.category.name}
                </p>
              )}
              <h2 className="pr-10 text-2xl font-black leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                {product.name}
              </h2>
              <p className="mt-3 flex items-baseline gap-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                {formatRupee(unitPrice)}
                {selectedVariant && (
                  <span className="text-sm font-normal text-slate-500">
                    base {formatRupee(basePrice)}
                  </span>
                )}
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                {product.description}
              </p>
            </header>

            {hasVariants && (
              <VariantSelector
                variants={variants}
                selectedId={selectedVariantId}
                onChange={setSelectedVariantId}
                basePrice={basePrice}
              />
            )}

            {customizable && (
              <section>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Make it yours
                </h3>
                <CustomizationForm
                  value={customization}
                  onChange={setCustomization}
                />
              </section>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={requiresVariant || variantOutOfStock}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 font-semibold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none disabled:hover:translate-y-0"
              >
                <ShoppingBag className="h-4 w-4" strokeWidth={2.25} />
                {requiresVariant
                  ? "Select a variant"
                  : variantOutOfStock
                    ? "Out of stock"
                    : "Add to Cart"}
              </button>
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=Hi I want to order ${encodeURIComponent(product.name)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-3.5 font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-brand-700"
              >
                <MessageCircle className="h-4 w-4" strokeWidth={2.25} />
                Order on WhatsApp
              </a>
            </div>

            <ReviewSection productId={product.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
