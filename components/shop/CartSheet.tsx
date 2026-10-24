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
        className={`fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Sheet */}
      <aside
        aria-label="Cart"
        className={`fixed top-0 right-0 z-[70] h-full w-full max-w-md bg-slate-50 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between px-6 pb-4 pt-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Your bag
              <span className="ml-2 font-mono text-sm font-normal text-slate-500">
                {pricing.itemCount} item{pricing.itemCount === 1 ? "" : "s"}
              </span>
            </h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close cart"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 ring-1 ring-slate-200 transition hover:text-slate-900 hover:ring-slate-400"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-2">
            {items.length === 0 ? (
              <div className="py-16">
                <p className="font-display text-2xl font-semibold tracking-tight text-slate-900">Your bag is empty.</p>
                <p className="mt-2 text-slate-600">
                  Every piece is printed to order — start with a nameplate or a
                  Mini Me.
                </p>
                <Link
                  href="/search"
                  onClick={() => setOpen(false)}
                  className="mt-6 inline-flex rounded-full bg-slate-900 px-6 py-3.5 font-semibold text-white transition hover:bg-slate-800"
                >
                  Shop the catalog
                </Link>
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {items.map((item) => (
                  <li
                    key={`${item.productId}::${item.variantId ?? "_"}`}
                    className="flex gap-4 rounded-2xl bg-white p-3 ring-1 ring-slate-200/70"
                  >
                    <div className="h-24 w-16 flex-none overflow-hidden rounded-xl">
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
                        <p className="font-display font-semibold leading-snug tracking-tight line-clamp-2">
                          {item.name}
                          {item.variantName && (
                            <span className="block font-sans text-xs font-normal text-slate-500">
                              {item.variantName}
                            </span>
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() => remove(item.productId, item.variantId)}
                          className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Remove from cart"
                          title="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-1 font-mono font-bold text-slate-900">
                        {formatRupee(item.unitPrice * item.quantity)}
                      </p>
                      <div className="mt-auto flex items-center gap-1 pt-2">
                        <button
                          type="button"
                          onClick={() => dec(item.productId, item.variantId)}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 hover:text-slate-900"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-7 text-center font-mono text-sm font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => inc(item.productId, item.variantId)}
                          className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 hover:text-slate-900"
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
            <footer className="bg-white px-6 pb-6 pt-5 shadow-[0_-1px_0_rgba(15,23,42,.08)]">
              <dl className="mb-5 space-y-2 text-[15px]">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Subtotal</dt>
                  <dd className="font-mono font-medium">{formatRupee(pricing.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Shipping</dt>
                  <dd className="font-mono font-medium">
                    {pricing.shipping === 0 ? "Free" : formatRupee(pricing.shipping)}
                  </dd>
                </div>
                <div className="flex justify-between pt-2 font-display text-xl font-semibold">
                  <dt>Total</dt>
                  <dd className="font-mono">{formatRupee(pricing.total)}</dd>
                </div>
              </dl>
              <div className="flex flex-col gap-2">
                <Link
                  href="/checkout"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-6 py-4 text-center font-semibold text-slate-950 transition hover:brightness-110 active:scale-[.98]"
                >
                  Proceed to checkout
                </Link>
                <Link
                  href="/cart"
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-white px-6 py-4 text-center font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:ring-slate-400"
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
      // Default look is a plain icon button; the header passes its own
      // colour/hover classes so it matches the search icon beside it.
      className={`relative ${
        className || "inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-900 transition hover:bg-slate-100"
      }`}
    >
      <ShoppingBag className="h-5 w-5" strokeWidth={2} />
      {itemCount > 0 && (
        <span className="absolute right-0.5 top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-500 px-1 font-mono text-[10px] font-bold leading-none text-slate-950">
          {itemCount}
        </span>
      )}
    </button>
  );
}
