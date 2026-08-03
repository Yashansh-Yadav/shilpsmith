"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import {
  Box,
  Minus,
  Package,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";

import { priceFromProduct, useCartStore } from "../../lib/store/cart";
import { parsePriceString } from "../../lib/discounts";
import {
  resolveEnabledFields,
  type CustomFieldsConfig,
} from "../../lib/customization";
import { sanitizeHtml } from "../../lib/sanitize";
import ProductGallery from "./ProductGallery";
import StarRating from "./StarRating";
import VariantSelector, { type VariantSummary } from "./VariantSelector";
import CustomizationForm, {
  customizationToRecord,
  type CustomizationValues,
} from "./CustomizationForm";
import DynamicCustomizationForm, {
  dynamicValuesToRecord,
} from "./DynamicCustomizationForm";

// Legacy rows predate write-time sanitization, and this regex decides
// plain-text vs HTML rendering — so re-sanitize here as defense in depth.
const HTML_RE = /<[a-z][\s\S]*>/i;

// Nobody buys 100 of a made-to-order print in one click; the cart store caps at
// 100 anyway. Keep the stepper honest about what we can actually fulfil.
const MAX_QTY = 10;

// three.js is ~500 kB. Only pull it in when the customer asks for the 3D view.
const ThreeDViewer = dynamic(() => import("./ThreeDViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-3xl bg-slate-100 text-sm text-slate-500">
      Loading 3D viewer…
    </div>
  ),
});

export interface DetailVariant {
  id: number;
  name: string;
  sku?: string | null;
  priceModifier: number;
  stock: number;
}

/** Plain, JSON-safe product shape. The page serializes Prisma into this. */
export interface ProductDetailData {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: string;
  discountPrice: string | null;
  eventDiscountPercent: number;
  customizable: boolean;
  stock: number;
  stockStatus: string;
  lowStockThreshold: number;
  modelUrl: string | null;
  customFields: CustomFieldsConfig | null;
  category: { name: string; slug: string } | null;
  images: { url: string }[];
  variants: DetailVariant[];
  deity: { key: string; nameEn: string; active: boolean } | null;
}

interface Props {
  product: ProductDetailData;
  /** Approved-review summary, rendered server-side so it's in the HTML. */
  rating: { average: number; count: number };
}

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function ProductDetail({ product, rating }: Props) {
  const router = useRouter();
  const add = useCartStore((s) => s.add);
  const setCartOpen = useCartStore((s) => s.setOpen);

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [customization, setCustomization] = useState<CustomizationValues>({});
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [show3D, setShow3D] = useState(false);
  const [qty, setQty] = useState(1);

  const variants = product.variants;
  const hasVariants = variants.length > 0;
  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === selectedVariantId) ?? null,
    [variants, selectedVariantId]
  );

  const basePrice = useMemo(() => priceFromProduct(product), [product]);

  // What the cart stores: sale price + variant modifier, WITHOUT the event
  // discount. Event discounts are order-level and applied across the whole cart
  // at checkout, so baking them into a line price would double-count them.
  const unitPrice = basePrice + Number(selectedVariant?.priceModifier ?? 0);

  // What we DISPLAY: the better of the product's own sale price or the event
  // discount — never both stacked. Same rule as the card, so the price doesn't
  // change when the customer clicks through.
  const eventPct = product.eventDiscountPercent ?? 0;
  const displayUnit = useMemo(() => {
    const modifier = Number(selectedVariant?.priceModifier ?? 0);
    const listRaw = parsePriceString(product.price) + modifier;
    const eventPrice =
      eventPct > 0 ? Math.round(listRaw * (1 - eventPct / 100)) : listRaw;
    return Math.min(unitPrice, eventPrice);
  }, [product.price, selectedVariant, eventPct, unitPrice]);

  const listUnit = useMemo(() => {
    const list =
      parsePriceString(product.price) +
      Number(selectedVariant?.priceModifier ?? 0);
    return Number.isFinite(list) && displayUnit < list ? list : null;
  }, [product.price, selectedVariant, displayUnit]);

  const percentOff =
    listUnit != null ? Math.round(((listUnit - displayUnit) / listUnit) * 100) : 0;

  const enabledFields = useMemo(
    () => resolveEnabledFields(product.customFields),
    [product.customFields]
  );
  const customizable = product.customizable === true;
  const useDynamicCustomization = customizable && enabledFields.length > 0;

  // Stock is read off the variant when one is selected, otherwise the product.
  // Mirrors what /api/orders enforces, so the page never promises a unit
  // checkout will refuse.
  const outOfStock =
    product.stockStatus === "out-of-stock" ||
    (selectedVariant ? selectedVariant.stock === 0 : product.stock === 0);
  const availableStock = selectedVariant
    ? selectedVariant.stock
    : product.stock;
  const lowStock =
    !outOfStock && availableStock > 0 && availableStock <= product.lowStockThreshold;
  const maxQty = availableStock > 0 ? Math.min(availableStock, MAX_QTY) : MAX_QTY;
  const requiresVariant = hasVariants && selectedVariantId == null;

  /** Returns the cart line, or null when the selection isn't complete yet. */
  function buildLine() {
    if (requiresVariant) {
      toast.error("Pick a variant first");
      return null;
    }
    if (outOfStock) {
      toast.error("That option is out of stock");
      return null;
    }

    let cust: Record<string, string> | undefined;
    if (useDynamicCustomization) {
      const missing = enabledFields.find(
        (f) => f.required && !(customValues[f.label] ?? "").trim()
      );
      if (missing) {
        toast.error(`Please fill: ${missing.label}`);
        return null;
      }
      cust = dynamicValuesToRecord(customValues);
    } else if (customizable) {
      cust = customizationToRecord(customization);
    }

    return {
      productId: product.id,
      variantId: selectedVariant?.id ?? null,
      variantName: selectedVariant?.name ?? null,
      name: product.name,
      slug: product.slug,
      imageUrl: product.images[0]?.url ?? null,
      unitPrice,
      customization: cust,
    };
  }

  function handleAddToCart() {
    const line = buildLine();
    if (!line) return;
    add(line, qty);
    toast.success(`Added ${product.name} to cart`);
    setCartOpen(true);
  }

  function handleBuyNow() {
    const line = buildLine();
    if (!line) return;
    add(line, qty);
    router.push("/checkout");
  }

  const ctaLabel = requiresVariant
    ? "Select a variant"
    : outOfStock
      ? "Out of stock"
      : "Add to cart";
  const ctaDisabled = requiresVariant || outOfStock;

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* ─────────────── Gallery / 3D ─────────────── */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative overflow-hidden rounded-4xl border border-slate-100 bg-white shadow-sm">
            {show3D && product.modelUrl ? (
              <div className="p-3 sm:p-4">
                <ThreeDViewer url={product.modelUrl} height={460} />
              </div>
            ) : (
              <ProductGallery
                images={product.images}
                productName={product.name}
                productId={product.id}
              />
            )}

            {product.modelUrl && (
              <button
                type="button"
                onClick={() => setShow3D((v) => !v)}
                className="absolute left-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 text-xs font-semibold text-slate-900 shadow-lg backdrop-blur transition hover:bg-white"
              >
                <Box className="h-3.5 w-3.5" strokeWidth={2.5} />
                {show3D ? "Show photos" : "View in 3D"}
              </button>
            )}
          </div>
        </div>

        {/* ─────────────── Buy panel ─────────────── */}
        <div className="flex flex-col gap-6">
          <header>
            {product.category && (
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-700">
                {product.category.name}
              </p>
            )}
            <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              {product.name}
            </h1>

            {/* Rating jumps to the reviews block rather than repeating it here. */}
            <a
              href="#reviews"
              className="mt-3 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-800"
            >
              <StarRating value={rating.average} readOnly size="sm" />
              {rating.count > 0 ? (
                <span>
                  <span className="font-semibold text-slate-900">
                    {rating.average.toFixed(1)}
                  </span>{" "}
                  · {rating.count} review{rating.count > 1 ? "s" : ""}
                </span>
              ) : (
                <span>No reviews yet — be the first</span>
              )}
            </a>
          </header>

          <div>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-spec text-3xl font-black tracking-tight text-slate-900">
                {formatRupee(displayUnit)}
              </span>
              {listUnit != null && (
                <span className="font-spec text-base text-slate-400 line-through">
                  {formatRupee(listUnit)}
                </span>
              )}
              {percentOff > 0 && (
                <span className="rounded-full bg-brand-600 px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-white">
                  {percentOff}% off
                </span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Inclusive of all taxes · Free shipping over ₹1,000
              {selectedVariant && ` · Base ${formatRupee(basePrice)}`}
            </p>
          </div>

          {/* Stock line — one clear statement, no contradictory badges. */}
          <div className="text-sm font-semibold">
            {outOfStock ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
                <Package className="h-4 w-4" /> Out of stock
              </span>
            ) : lowStock ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-amber-700">
                <Package className="h-4 w-4" /> Only {availableStock} left
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-brand-700">
                <Package className="h-4 w-4" /> In stock · made to order
              </span>
            )}
          </div>

          {product.shortDescription && (
            <p className="text-base leading-relaxed text-slate-600">
              {product.shortDescription}
            </p>
          )}

          {hasVariants && (
            <VariantSelector
              variants={variants as unknown as VariantSummary[]}
              selectedId={selectedVariantId}
              onChange={(id) => {
                setSelectedVariantId(id);
                setQty(1); // a new variant has its own stock ceiling
              }}
              basePrice={basePrice}
            />
          )}

          {customizable && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Make it yours
              </h2>
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

          {/* Quantity + CTAs */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-slate-700">Quantity</span>
              <div className="inline-flex items-center rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                  className="flex h-11 w-11 items-center justify-center text-slate-600 transition hover:text-slate-900 disabled:opacity-30"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center font-spec text-base font-bold">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty}
                  aria-label="Increase quantity"
                  className="flex h-11 w-11 items-center justify-center text-slate-600 transition hover:text-slate-900 disabled:opacity-30"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={ctaDisabled}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-slate-900 px-6 py-3.5 font-semibold text-slate-900 transition hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-transparent disabled:hover:text-slate-400"
              >
                <ShoppingBag className="h-4 w-4" strokeWidth={2.25} />
                {ctaLabel}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={ctaDisabled}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-3.5 font-semibold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none disabled:hover:translate-y-0"
              >
                Buy now
              </button>
            </div>
          </div>

          {/* Trust row */}
          <ul className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 text-sm text-slate-600 sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <Truck className="h-4 w-4 shrink-0 text-brand-600" />
              Ships in 3–7 days
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" />
              Quality checked
            </li>
            <li className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 shrink-0 text-brand-600" />
              Easy support
            </li>
          </ul>

          {product.deity?.active && (
            <section className="rounded-3xl border border-brand-200 bg-brand-50 p-5">
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-brand-800">
                <span aria-hidden>📲</span> Smart NFC idol
              </h2>
              <p className="mb-3 text-sm text-brand-900/80">
                Tap your phone on this idol to open a live darshan — aarti,
                bhajans, scriptures and today&apos;s panchang, in Hindi or English.
              </p>
              <a
                href={`/darshan/${product.deity.key}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-cta transition hover:bg-brand-700"
              >
                View live darshan →
              </a>
            </section>
          )}
        </div>
      </div>

      {/* ─────────────── Full description ─────────────── */}
      {product.description && (
        <section className="mt-14 border-t border-slate-100 pt-10">
          <h2 className="mb-5 text-xl font-black tracking-tight">
            Product details
          </h2>
          {HTML_RE.test(product.description) ? (
            <div
              className="max-w-3xl text-base leading-relaxed text-slate-600 [&_a]:text-brand-700 [&_a]:underline [&_blockquote]:mt-3 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-200 [&_blockquote]:pl-4 [&_blockquote]:text-slate-500 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:mt-5 [&_h3]:font-semibold [&_h3]:text-slate-900 [&_li]:mt-1 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_p:first-child]:mt-0 [&_strong]:font-semibold [&_strong]:text-slate-900 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(product.description),
              }}
            />
          ) : (
            <p className="max-w-3xl whitespace-pre-line text-base leading-relaxed text-slate-600">
              {product.description}
            </p>
          )}
        </section>
      )}

      {/* Mobile action bar — the CTAs scroll away on a long page, and a PDP
          without a persistent buy button is where mobile conversions die. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="min-w-0">
          <p className="font-spec text-lg font-black leading-none">
            {formatRupee(displayUnit)}
          </p>
          {listUnit != null && (
            <p className="font-spec text-xs text-slate-400 line-through">
              {formatRupee(listUnit)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={ctaDisabled}
          className="ml-auto inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white transition disabled:bg-slate-300"
        >
          <ShoppingBag className="h-4 w-4" strokeWidth={2.25} />
          {ctaLabel}
        </button>
      </div>
      {/* Spacer so the fixed bar never covers the last section on mobile. */}
      <div className="h-20 lg:hidden" aria-hidden />
    </>
  );
}
