"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import ProductCard, { type StorefrontProduct } from "./ProductCard";

interface Props {
  products: StorefrontProduct[];
  onSelect: (product: StorefrontProduct) => void;
  // Width of each card on desktop. Mobile always shows ~1.7 cards so users see
  // that the row is scrollable.
  cardWidthClass?: string;
  emptyMessage?: string;
}

export default function ProductCarousel({
  products,
  onSelect,
  cardWidthClass = "w-[180px] sm:w-[200px] lg:w-[220px]",
  emptyMessage,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Compute whether arrows should be enabled based on scroll position.
  const recompute = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    recompute();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", recompute, { passive: true });
    window.addEventListener("resize", recompute);
    return () => {
      el.removeEventListener("scroll", recompute);
      window.removeEventListener("resize", recompute);
    };
  }, [recompute, products.length]);

  const scrollBy = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = Math.max(el.clientWidth * 0.85, 280);
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  };

  if (products.length === 0) {
    return emptyMessage ? (
      <div className="rounded-3xl bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
        {emptyMessage}
      </div>
    ) : null;
  }

  return (
    <div className="relative">
      {/* Edge fades for visual cue that there's more to scroll */}
      <div
        className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-slate-50 to-transparent transition-opacity ${
          canScrollLeft ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-slate-50 to-transparent transition-opacity ${
          canScrollRight ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Arrows — hidden on touch */}
      <button
        type="button"
        aria-label="Scroll left"
        disabled={!canScrollLeft}
        onClick={() => scrollBy(-1)}
        className={`absolute left-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-lift ring-1 ring-slate-200 transition lg:flex ${
          canScrollLeft
            ? "hover:-translate-y-1/2 hover:scale-105 hover:text-slate-900"
            : "cursor-not-allowed opacity-40"
        }`}
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        disabled={!canScrollRight}
        onClick={() => scrollBy(1)}
        className={`absolute right-2 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-lift ring-1 ring-slate-200 transition lg:flex ${
          canScrollRight
            ? "hover:-translate-y-1/2 hover:scale-105 hover:text-slate-900"
            : "cursor-not-allowed opacity-40"
        }`}
      >
        <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
      </button>

      <div
        ref={scrollerRef}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5 lg:gap-6"
      >
        {products.map((p) => (
          <div key={p.id} className={`flex-none snap-start ${cardWidthClass}`}>
            <ProductCard product={p} onSelect={onSelect} />
          </div>
        ))}
      </div>
    </div>
  );
}
