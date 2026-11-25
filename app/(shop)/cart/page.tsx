"use client";

import Link from "next/link";
import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";

import { useCartStore, computePricing } from "../../../lib/store/cart";
import { useShippingConfig } from "../../../lib/useShippingConfig";
import ProductImage from "../../../components/shop/ProductImage";

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

// Chrome (header, footer, cart drawer, toasts) comes from app/(shop)/layout.tsx.
export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const inc = useCartStore((s) => s.inc);
  const dec = useCartStore((s) => s.dec);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);

  const shippingConfig = useShippingConfig();
  const pricing = computePricing(items, 0, shippingConfig);

  return (
    <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
            {pricing.itemCount} item{pricing.itemCount === 1 ? "" : "s"}
          </p>
          <h1 className="mt-2 font-display text-5xl font-semibold tracking-[-0.035em] text-slate-900 sm:text-6xl">
            Your bag
          </h1>
        </div>
        <Link
          href="/search"
          className="inline-flex items-center gap-1.5 font-semibold text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Continue shopping
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[2rem] bg-white p-10 text-center ring-1 ring-slate-200/70 sm:p-16">
          <p className="font-display text-3xl font-semibold tracking-tight text-slate-900">
            Your bag is empty.
          </p>
          <p className="mx-auto mt-3 max-w-md text-lg text-slate-600">
            Every piece is printed to order — start with a nameplate, a Mini Me
            or a Smart idol.
          </p>
          <Link
            href="/search"
            className="mt-8 inline-flex rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-7 py-4 font-semibold text-slate-950 transition hover:brightness-110 active:scale-[.97]"
          >
            Shop the catalog
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div>
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={`${item.productId}::${item.variantId ?? "_"}`}
                  className="flex gap-5 rounded-[1.75rem] bg-white p-4 ring-1 ring-slate-200/70 sm:p-5"
                >
                  <div className="h-36 w-24 flex-none overflow-hidden rounded-2xl sm:h-40 sm:w-28">
                    <ProductImage
                      src={item.imageUrl}
                      alt={item.name}
                      productId={item.productId}
                      aspectClass="h-full w-full"
                      variant="mini"
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-display text-xl font-semibold leading-tight tracking-tight text-slate-900">
                          {item.name}
                        </h2>
                        {item.variantName && (
                          <p className="mt-1 text-sm text-slate-500">{item.variantName}</p>
                        )}
                        <p className="mt-1 font-mono text-sm text-slate-500">
                          {formatRupee(item.unitPrice)} each
                        </p>
                        {item.customization &&
                          Object.keys(item.customization).length > 0 && (
                            <dl className="mt-3 space-y-0.5 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                              {Object.entries(item.customization).map(([k, v]) => (
                                <div key={k}>
                                  <dt className="inline font-semibold capitalize text-slate-700">{k}:</dt>{" "}
                                  <dd className="inline">{String(v)}</dd>
                                </div>
                              ))}
                            </dl>
                          )}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item.productId, item.variantId)}
                        aria-label={`Remove ${item.name}`}
                        className="flex h-10 w-10 flex-none items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-4">
                      <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
                        <button
                          type="button"
                          onClick={() => dec(item.productId, item.variantId)}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition hover:bg-white"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-mono text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => inc(item.productId, item.variantId)}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-slate-700 transition hover:bg-white"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="font-mono text-lg font-bold text-slate-900">
                        {formatRupee(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={clear}
                className="text-sm font-medium text-slate-500 transition hover:text-red-600"
              >
                Clear bag
              </button>
            </div>
          </div>

          <aside className="h-fit rounded-[2rem] bg-white p-7 ring-1 ring-slate-200/70 lg:sticky lg:top-24">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Order summary</h2>

            <dl className="mt-6 space-y-3 text-[15px]">
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal ({pricing.itemCount} items)</dt>
                <dd className="font-mono font-medium">{formatRupee(pricing.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Shipping</dt>
                <dd className="font-mono font-medium">
                  {pricing.shipping === 0 ? "Free" : formatRupee(pricing.shipping)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Tax (GST)</dt>
                <dd className="font-mono font-medium">{formatRupee(pricing.tax)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-slate-100 pt-4">
                <dt className="font-display text-lg font-semibold">Total</dt>
                <dd className="font-mono text-2xl font-bold">{formatRupee(pricing.total)}</dd>
              </div>
            </dl>

            <Link
              href="/checkout"
              className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 py-4 font-semibold text-slate-950 transition hover:brightness-110 active:scale-[.98]"
            >
              Proceed to checkout
              <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
            </Link>
            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Shipping calculated at checkout. Taxes shown above are an estimate.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
