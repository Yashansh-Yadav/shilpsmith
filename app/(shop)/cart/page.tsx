"use client";

import Link from "next/link";
import { Toaster } from "react-hot-toast";

import { ArrowLeft, ArrowRight } from "lucide-react";

import { useCartStore, computePricing } from "../../../lib/store/cart";
import ProductImage from "../../../components/shop/ProductImage";

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const inc = useCartStore((s) => s.inc);
  const dec = useCartStore((s) => s.dec);
  const remove = useCartStore((s) => s.remove);
  const clear = useCartStore((s) => s.clear);

  const pricing = computePricing(items);

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <Toaster />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Your Cart
          </h1>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Continue shopping
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
            <p className="mb-4 text-slate-500">Your cart is empty.</p>
            <Link
              href="/"
              className="inline-block rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={`${item.productId}::${item.variantId ?? "_"}`}
                  className="flex gap-4 rounded-3xl bg-white p-4 shadow-sm"
                >
                  <div className="h-24 w-24 flex-none overflow-hidden rounded-2xl">
                    <ProductImage
                      src={item.imageUrl}
                      alt={item.name}
                      productId={item.productId}
                      aspectClass="h-full w-full"
                      variant="mini"
                    />
                  </div>

                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold">
                          {item.name}
                          {item.variantName && (
                            <span className="ml-2 text-sm font-normal text-slate-500">
                              · {item.variantName}
                            </span>
                          )}
                        </h2>
                        <p className="text-sm text-slate-500">
                          {formatRupee(item.unitPrice)} each
                        </p>
                        {item.customization &&
                          Object.keys(item.customization).length > 0 && (
                            <dl className="mt-1 text-xs text-slate-500">
                              {Object.entries(item.customization).map(
                                ([k, v]) => (
                                  <div key={k}>
                                    <dt className="inline font-medium">
                                      {k}:
                                    </dt>{" "}
                                    <dd className="inline">{String(v)}</dd>
                                  </div>
                                )
                              )}
                            </dl>
                          )}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item.productId, item.variantId)}
                        className="text-xs text-slate-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => dec(item.productId, item.variantId)}
                          className="h-8 w-8 rounded-full border border-slate-200"
                          aria-label="Decrease"
                        >
                          −
                        </button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => inc(item.productId, item.variantId)}
                          className="h-8 w-8 rounded-full border border-slate-200"
                          aria-label="Increase"
                        >
                          +
                        </button>
                      </div>

                      <p className="font-bold text-emerald-700">
                        {formatRupee(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}

              <li className="flex justify-end">
                <button
                  type="button"
                  onClick={clear}
                  className="text-xs text-slate-500 hover:text-red-600"
                >
                  Clear cart
                </button>
              </li>
            </ul>

            <aside className="h-fit rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-bold">Order Summary</h2>

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">
                    Subtotal ({pricing.itemCount} items)
                  </dt>
                  <dd className="font-medium">
                    {formatRupee(pricing.subtotal)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Shipping</dt>
                  <dd className="font-medium">
                    {pricing.shipping === 0
                      ? "Free"
                      : formatRupee(pricing.shipping)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Tax (GST)</dt>
                  <dd className="font-medium">{formatRupee(pricing.tax)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold">
                  <dt>Total</dt>
                  <dd>{formatRupee(pricing.total)}</dd>
                </div>
              </dl>

              <Link
                href="/checkout"
                className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Proceed to checkout
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <p className="mt-3 text-xs text-slate-500">
                Shipping calculated at checkout. Taxes shown above are an
                estimate.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
