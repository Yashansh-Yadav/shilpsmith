// components/ProductModal.tsx

"use client";

import toast from "react-hot-toast";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box, ShoppingBag, X } from "lucide-react";

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
import DynamicCustomizationForm, {
  dynamicValuesToRecord,
} from "./shop/DynamicCustomizationForm";
import ReviewSection from "./shop/ReviewSection";
import ProductGallery from "./shop/ProductGallery";
import { sanitizeHtml } from "../lib/sanitize";
import { resolveEnabledFields } from "../lib/customization";

// Descriptions are sanitized on write, but legacy rows predate that and the
// regex below decides plain-text vs HTML rendering — so re-sanitize here too as
// cheap defense-in-depth before dangerouslySetInnerHTML.
const HTML_RE = /<[a-z][\s\S]*>/i;

// Collapsed description height (px). Anything taller gets a "View more" toggle so
// the sticky action buttons stay in frame on open.
const DESC_COLLAPSED_PX = 176;

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
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [show3D, setShow3D] = useState(false);

  // Description collapse/expand.
  const descRef = useRef<HTMLDivElement>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [descOverflows, setDescOverflows] = useState(false);

  // Reset state every time a different product is opened.
  useEffect(() => {
    setSelectedVariantId(null);
    setCustomization({});
    setCustomValues({});
    setShow3D(false);
    setDescExpanded(false);
    setVariants(
      Array.isArray(product?.variants) ? (product.variants as VariantSummary[]) : []
    );
  }, [product?.id, product?.variants]);

  // Measure the rendered description to decide whether to clamp it. scrollHeight
  // reflects the full content height even while the max-height clamp is applied.
  useEffect(() => {
    const el = descRef.current;
    if (!el) {
      setDescOverflows(false);
      return;
    }
    setDescOverflows(el.scrollHeight > DESC_COLLAPSED_PX + 8);
  }, [product?.id, product?.description]);

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

  // Admin-configured customization fields for this product. When none are
  // configured we fall back to the legacy text/color/notes form.
  const enabledFields = useMemo(
    () => resolveEnabledFields(product?.customFields),
    [product?.customFields]
  );

  if (!product) return null;

  const customizable =
    product.customizable === true || product.customizable === 1;
  const useDynamicCustomization = customizable && enabledFields.length > 0;

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

    let cust: Record<string, string> | undefined;
    if (useDynamicCustomization) {
      // Enforce required fields before adding to cart.
      const missing = enabledFields.find(
        (f) => f.required && !(customValues[f.label] ?? "").trim()
      );
      if (missing) {
        toast.error(`Please fill: ${missing.label}`);
        return;
      }
      cust = dynamicValuesToRecord(customValues);
    } else if (customizable) {
      cust = customizationToRecord(customization);
    }

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
      <div className="relative flex w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden rounded-4xl bg-white shadow-2xl lg:flex-row">
        <button
          onClick={onClose}
          aria-label="Close product details"
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-lg backdrop-blur transition hover:bg-white hover:text-slate-900"
        >
          <X className="h-5 w-5" />
        </button>

        {/* IMAGE GALLERY / 3D VIEWER — fixed photo panel, centered, no stretch */}
        <div className="relative flex shrink-0 items-center justify-center bg-slate-50 lg:w-[46%]">
          {show3D && product.modelUrl ? (
            <div className="w-full p-3 lg:p-4">
              <ThreeDViewer url={product.modelUrl} height={420} />
            </div>
          ) : (
            <div className="w-full">
              <ProductGallery
                images={Array.isArray(product.images) ? product.images : []}
                productName={product.name}
                productId={product.id}
              />
            </div>
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

        {/* DETAILS — scrolls independently; CTAs pinned in the sticky footer */}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5 sm:p-8 lg:p-10">
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
            </header>

            {product.description && (
              <div>
                <div
                  ref={descRef}
                  style={
                    !descExpanded && descOverflows
                      ? { maxHeight: DESC_COLLAPSED_PX }
                      : undefined
                  }
                  className="relative overflow-hidden text-base leading-relaxed text-slate-600"
                >
                  {HTML_RE.test(product.description) ? (
                    <div
                      className="[&_a]:text-brand-700 [&_a]:underline [&_blockquote]:mt-3 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-200 [&_blockquote]:pl-4 [&_blockquote]:text-slate-500 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-slate-900 [&_li]:mt-1 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_p:first-child]:mt-0 [&_strong]:font-semibold [&_strong]:text-slate-900 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(product.description),
                      }}
                    />
                  ) : (
                    <p className="whitespace-pre-line">{product.description}</p>
                  )}
                  {!descExpanded && descOverflows && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white to-transparent" />
                  )}
                </div>
                {descOverflows && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded((v) => !v)}
                    className="mt-2 text-sm font-semibold text-brand-700 transition hover:text-brand-800 hover:underline"
                  >
                    {descExpanded ? "View less" : "View more"}
                  </button>
                )}
              </div>
            )}

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
                {useDynamicCustomization ? (
                  <DynamicCustomizationForm
                    fields={enabledFields}
                    value={customValues}
                    onChange={setCustomValues}
                  />
                ) : (
                  <CustomizationForm
                    value={customization}
                    onChange={setCustomization}
                  />
                )}
              </section>
            )}

            <ReviewSection productId={product.id} />
          </div>

          {/* Sticky action bar — always visible regardless of description length */}
          <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 bg-white p-4 sm:flex-row sm:p-5">
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
          </div>
        </div>
      </div>
    </div>
  );
}
