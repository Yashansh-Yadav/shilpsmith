"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { parsePrice } from "../validators";

// --- Types -----------------------------------------------------------------

export interface CartCustomization {
  [field: string]: string | number | boolean;
}

export interface CartItem {
  productId: number;
  variantId?: number | null;
  variantName?: string | null;
  name: string;
  slug: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  customization?: CartCustomization;
}

export interface PricingBreakdown {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  itemCount: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  hydrated: boolean;
  discountCode: string | null;

  // Actions
  add: (item: Omit<CartItem, "quantity">, qty?: number) => void;
  remove: (productId: number, variantId?: number | null) => void;
  setQuantity: (productId: number, variantId: number | null | undefined, qty: number) => void;
  inc: (productId: number, variantId?: number | null) => void;
  dec: (productId: number, variantId?: number | null) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
  applyDiscount: (code: string | null) => void;
}

// --- Pricing helpers -------------------------------------------------------

export function computePricing(
  items: CartItem[],
  discount: number = 0
): PricingBreakdown {
  const subtotal = items.reduce(
    (acc, i) => acc + i.unitPrice * i.quantity,
    0
  );
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  // Flat shipping for orders under ₹1000.
  const shipping = subtotal === 0 ? 0 : subtotal >= 1000 ? 0 : 50;
  // GST placeholder: 0% for now — surfaced in UI to keep the line item visible.
  const tax = 0;
  const total = Math.max(0, subtotal + shipping + tax - discount);

  return { subtotal, shipping, tax, discount, total, itemCount };
}

function keyOf(productId: number, variantId?: number | null) {
  return `${productId}::${variantId ?? "_"}`;
}

// --- Store -----------------------------------------------------------------

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      hydrated: false,
      discountCode: null,

      add: (item, qty = 1) =>
        set((state) => {
          const k = keyOf(item.productId, item.variantId);
          const existing = state.items.find(
            (i) => keyOf(i.productId, i.variantId) === k
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                keyOf(i.productId, i.variantId) === k
                  ? { ...i, quantity: i.quantity + qty }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: qty }] };
        }),

      remove: (productId, variantId) =>
        set((state) => ({
          items: state.items.filter(
            (i) => keyOf(i.productId, i.variantId) !== keyOf(productId, variantId)
          ),
        })),

      setQuantity: (productId, variantId, qty) =>
        set((state) => {
          if (qty <= 0) {
            return {
              items: state.items.filter(
                (i) =>
                  keyOf(i.productId, i.variantId) !== keyOf(productId, variantId)
              ),
            };
          }
          return {
            items: state.items.map((i) =>
              keyOf(i.productId, i.variantId) === keyOf(productId, variantId)
                ? { ...i, quantity: Math.min(qty, 100) }
                : i
            ),
          };
        }),

      inc: (productId, variantId) =>
        get().setQuantity(
          productId,
          variantId ?? null,
          (get().items.find(
            (i) => keyOf(i.productId, i.variantId) === keyOf(productId, variantId)
          )?.quantity ?? 0) + 1
        ),

      dec: (productId, variantId) =>
        get().setQuantity(
          productId,
          variantId ?? null,
          (get().items.find(
            (i) => keyOf(i.productId, i.variantId) === keyOf(productId, variantId)
          )?.quantity ?? 0) - 1
        ),

      clear: () => set({ items: [], discountCode: null }),
      setOpen: (open) => set({ isOpen: open }),
      applyDiscount: (code) => set({ discountCode: code }),
    }),
    {
      name: "shilpsmith-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        items: s.items,
        discountCode: s.discountCode,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setOpen?.(false);
        if (state) state.hydrated = true;
      },
    }
  )
);

// --- Cross-tab sync via BroadcastChannel -----------------------------------
// Zustand persist syncs to localStorage, but the storage event doesn't fire in
// the same tab that wrote it. BroadcastChannel gives us reliable cross-tab
// updates by re-hydrating from localStorage on signal.

if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  const channel = new BroadcastChannel("shilpsmith-cart-sync");
  let muted = false;

  useCartStore.subscribe((state, prev) => {
    if (muted) return;
    if (state.items !== prev.items || state.discountCode !== prev.discountCode) {
      channel.postMessage({ type: "update" });
    }
  });

  channel.onmessage = () => {
    muted = true;
    useCartStore.persist?.rehydrate?.();
    queueMicrotask(() => {
      muted = false;
    });
  };
}

// --- Helpers used outside React --------------------------------------------

export function priceFromProduct(product: { price: string }): number {
  const n = parsePrice(product.price);
  return Number.isFinite(n) ? n : 0;
}
