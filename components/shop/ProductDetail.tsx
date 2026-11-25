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
import { shippingNote, type ShippingConfig } from "../../lib/shipping";
import {
  resolveStorefrontFields,
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
  /**
   * Live admin shipping rule. Passed in (not defaulted here) so the promise
   * shown on the page is the one checkout will actually charge.
   */
  shipping: ShippingConfig;
}

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function ProductDetail({ product, rating, shipping }: Props) {
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
    () => resolveStorefrontFields(product.customFields),
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
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
        {/* ─────────────── Gallery / 3D ─────────────── */}
        <div className="lg:sticky lg:top-[5.5rem] lg:self-start">
          <div className="relative overflow-hidden rounded-[2rem]">
            {show3D && product.modelUrl ? (
              <div className="rounded-[2rem] bg-white p-3 sm:p-4">
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
                className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-slate-100 active:scale-[.97]"
              >
                <Box className="h-3.5 w-3.5" strokeWidth={2.5} />
                {show3D ? "Show photos" : "View in 3D"}
              </button>
            )}
          </div>
        </div>

        {/* ─────────────── Buy panel ─────────────── */}
        <div className="flex flex-col gap-7 lg:pt-2">
          <header>
            {product.category && (
              <p className="mb-4 font-mono text-xs font-medium uppercase tracking-[0.18em] text-brand-700">
                {product.category.name}
              </p>
            )}
            <h1 className="font-display text-4xl font-semibold leading-[0.98] tracking-[-0.035em] text-slate-900 sm:text-5xl lg:text-6xl">
              {product.name}
            </h1>

            {/* Rating jumps to the reviews block rather than repeating it here. */}
            <a
              href="#reviews"
              className="mt-5 inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900"
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
              <span className="font-mono text-4xl font-bold tracking-tight text-slate-900">
                {formatRupee(displayUnit)}
              </span>
              {listUnit != null && (
                <span className="font-mono text-lg text-slate-400 line-through">
                  {formatRupee(listUnit)}
                </span>
              )}
              {percentOff > 0 && (
                <span className="rounded-full bg-brand-500 px-3 py-1 font-mono text-xs font-bold text-slate-950">
                  {percentOff}% off
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Inclusive of all taxes · {shippingNote(shipping)}
              {selectedVariant && ` · Base ${formatRupee(basePrice)}`}
            </p>
          </div>

          {/* Stock line — one clear statement, no contradictory badges. */}
          <div className="text-sm font-semibold">
            {outOfStock ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-200/70 px-3.5 py-2 text-slate-700">
                <Package className="h-4 w-4" /> Out of stock
              </span>
            ) : lowStock ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3.5 py-2 text-amber-800">
                <Package className="h-4 w-4" /> Only {availableStock} left
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3.5 py-2 text-brand-800">
                <Package className="h-4 w-4" /> In stock · made to order
              </span>
            )}
          </div>

          {product.shortDescription && (
            <p className="text-lg leading-relaxed text-slate-600">
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
            <section className="rounded-[1.75rem] bg-white p-5 ring-1 ring-slate-200/70 sm:p-6">
              <h2 className="mb-4 font-display text-xl font-semibold tracking-tight text-slate-900">
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
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">Quantity</span>
              <div className="inline-flex items-center rounded-full bg-white p-1 ring-1 ring-slate-200">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  aria-label="Decrease quantity"
                  className="flex h-11 w-11 items-center justify-center text-slate-600 transition hover:text-slate-900 disabled:opacity-30"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-10 text-center font-mono text-base font-bold">
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
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-4 font-semibold text-white transition hover:bg-slate-800 active:scale-[.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:active:scale-100"
              >
                <ShoppingBag className="h-4 w-4" strokeWidth={2.25} />
                {ctaLabel}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={ctaDisabled}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-6 py-4 font-semibold text-slate-950 shadow-[0_12px_32px_-10px_rgba(16,185,129,.7)] transition hover:brightness-110 active:scale-[.98] disabled:cursor-not-allowed disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:active:scale-100"
              >
                Buy now
              </button>
            </div>
          </div>

          {/* Trust row */}
          <ul className="grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-3">
            <li className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70">
              <Truck className="h-4 w-4 shrink-0 text-brand-600" />
              Ships in 3–7 days
            </li>
            <li className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70">
              <ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" />
              Quality checked
            </li>
            <li className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200/70">
              <RefreshCw className="h-4 w-4 shrink-0 text-brand-600" />
              Easy support
            </li>
          </ul>

          {product.deity?.active && (
            <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-slate-950 p-6 text-white">
              <div aria-hidden="true" className="heated-bed absolute inset-0 -z-10" />
              <h2 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
                <span aria-hidden>📲</span> Smart NFC idol
              </h2>
              <p className="mb-4 text-sm leading-relaxed text-slate-300">
                Tap your phone on this idol to open a live darshan — aarti,
                bhajans, scriptures and today&apos;s panchang, in Hindi or English.
              </p>
              <a
                href={`/darshan/${product.deity.key}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-brand-400"
              >
                View live darshan →
              </a>
            </section>
          )}
        </div>
      </div>

      {/* ─────────────── Full description ─────────────── */}
      {product.description && (
        <section className="mt-24 grid gap-8 rounded-[2rem] bg-white p-7 sm:p-10 lg:mt-32 lg:grid-cols-[1fr_2fr] lg:gap-16 lg:p-14">
          <h2 className="font-display text-4xl font-semibold leading-none tracking-[-0.035em] text-slate-900 sm:text-5xl">
            Product details
          </h2>
          {HTML_RE.test(product.description) ? (
            <div
              className="max-w-3xl text-[17px] leading-relaxed text-slate-700 [&_a]:text-brand-700 [&_a]:underline [&_blockquote]:mt-3 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-200 [&_blockquote]:pl-4 [&_blockquote]:text-slate-500 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-slate-900 [&_h3]:mt-5 [&_h3]:font-semibold [&_h3]:text-slate-900 [&_li]:mt-1 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_p:first-child]:mt-0 [&_strong]:font-semibold [&_strong]:text-slate-900 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(product.description),
              }}
            />
          ) : (
            <p className="max-w-3xl whitespace-pre-line text-[17px] leading-relaxed text-slate-700">
              {product.description}
            </p>
          )}
        </section>
      )}

      {/* Mobile action bar — the CTAs scroll away on a long page, and a PDP
          without a persistent buy button is where mobile conversions die. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 bg-white/95 px-5 py-3 shadow-[0_-1px_0_rgba(15,23,42,.08)] backdrop-blur lg:hidden">
        <div className="min-w-0">
          <p className="font-mono text-lg font-bold leading-none">
            {formatRupee(displayUnit)}
          </p>
          {listUnit != null && (
            <p className="font-mono text-xs text-slate-400 line-through">
              {formatRupee(listUnit)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={ctaDisabled}
          className="ml-auto inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-5 py-3.5 font-semibold text-slate-950 transition active:scale-[.98] disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400"
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
