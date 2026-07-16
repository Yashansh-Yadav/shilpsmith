"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";

import { useCartStore, computePricing } from "../../lib/store/cart";
import { useShippingConfig } from "../../lib/useShippingConfig";
import ProductImage from "./ProductImage";

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function CartSheet() {
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const setOpen = useCartStore((s) => s.setOpen);
  const inc = useCartStore((s) => s.inc);
  const dec = useCartStore((s) => s.dec);
  const remove = useCartStore((s) => s.remove);

  const shippingConfig = useShippingConfig();
  const pricing = computePricing(items, 0, shippingConfig);

  // Lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, setOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden={!isOpen}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Sheet */}
      <aside
        aria-label="Cart"
        className={`fixed top-0 right-0 z-[70] h-full w-full max-w-md bg-white shadow-2xl transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <ShoppingBag className="h-5 w-5 text-brand-600" />
              Your Cart
              <span className="text-sm font-normal text-slate-500">
                ({pricing.itemCount})
              </span>
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close cart"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-5 py-4">
            {items.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <p className="mb-3">Your cart is empty.</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm font-semibold text-slate-900 underline"
                >
                  Continue shopping
                </button>
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {items.map((item) => (
                  <li
                    key={`${item.productId}::${item.variantId ?? "_"}`}
                    className="flex gap-3 rounded-2xl border border-slate-100 p-3"
                  >
                    <div className="h-20 w-20 flex-none overflow-hidden rounded-xl">
                      <ProductImage
                        src={item.imageUrl}
                        alt={item.name}
                        productId={item.productId}
                        aspectClass="h-full w-full"
                        variant="mini"
                      />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold line-clamp-2">
                          {item.name}
                          {item.variantName && (
                            <span className="block text-xs font-normal text-slate-500">
                              {item.variantName}
                            </span>
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() => remove(item.productId, item.variantId)}
                          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Remove from cart"
                          title="Remove"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="mt-1 text-sm font-bold text-brand-700">
                        {formatRupee(item.unitPrice * item.quantity)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => dec(item.productId, item.variantId)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => inc(item.productId, item.variantId)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {items.length > 0 && (
            <footer className="border-t border-slate-200 px-5 py-4">
              <dl className="mb-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Subtotal</dt>
                  <dd className="font-medium">{formatRupee(pricing.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Shipping</dt>
                  <dd className="font-medium">
                    {pricing.shipping === 0 ? "Free" : formatRupee(pricing.shipping)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold">
                  <dt>Total</dt>
                  <dd>{formatRupee(pricing.total)}</dd>
                </div>
              </dl>
              <div className="flex flex-col gap-2">
                <Link
                  href="/checkout"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white shadow-cta transition hover:bg-slate-800"
                >
                  Proceed to checkout
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                >
                  View full cart
                </Link>
              </div>
            </footer>
          )}
        </div>
      </aside>
    </>
  );
}

export function CartButton({
  className = "",
}: {
  className?: string;
}) {
  const itemCount = useCartStore((s) =>
    s.items.reduce((acc, i) => acc + i.quantity, 0)
  );
  const setOpen = useCartStore((s) => s.setOpen);

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`Open cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900 hover:shadow-md ${className}`}
    >
      <ShoppingBag className="h-4 w-4" strokeWidth={2.25} />
      {itemCount > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
          {itemCount}
        </span>
      )}
    </button>
  );
}
