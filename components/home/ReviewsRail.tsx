"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { StorefrontData } from "../../lib/storefront";
import Reveal from "../shop/Reveal";
import StarRating from "../shop/StarRating";

type Review = StorefrontData["testimonials"][number];

// Homepage reviews in the white panel (heading left, quotes right). Four
// quotes in view at once on tablet/desktop (a 2×2 grid), one-and-a-bit on
// phones. When there are more than fit, prev/next arrows, a "1–4 of N"
// counter and a scroll-progress bar make it obvious there's more to see.
export default function ReviewsRail({ reviews }: { reviews: Review[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ first: 1, last: Math.min(4, reviews.length), progress: 0, overflow: false });

  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    const left = el.scrollLeft;
    const right = left + el.clientWidth;
    // A card counts as "in view" when at least half of it is visible.
    const visible = cards
      .map((c, i) => ({ i, mid: c.offsetLeft - el.offsetLeft + c.offsetWidth / 2 }))
      .filter(({ mid }) => mid >= left && mid <= right)
      .map(({ i }) => i);
    const max = el.scrollWidth - el.clientWidth;
    setState({
      first: (visible[0] ?? 0) + 1,
      last: (visible[visible.length - 1] ?? 0) + 1,
      progress: max > 0 ? left / max : 1,
      overflow: max > 4,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = railRef.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, [measure, reviews.length]);

  const page = (dir: 1 | -1) => {
    const el = railRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  if (reviews.length === 0) return null;
  const atStart = state.progress <= 0.01;
  const atEnd = state.progress >= 0.99;
  // Thumb width = share of the rail in view, so it reads as "how much is left".
  const thumb = Math.max(((state.last - state.first + 1) / reviews.length) * 100, 12);

  const controls = state.overflow && (
    <div className="mt-8 lg:mt-auto">
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => page(-1)}
            disabled={atStart}
            aria-label="Previous reviews"
            className="grid h-11 w-11 place-items-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => page(1)}
            disabled={atEnd}
            aria-label="More reviews"
            className="grid h-11 w-11 place-items-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <p className="whitespace-nowrap font-mono text-sm tabular-nums text-slate-500" aria-live="polite">
          {state.first === state.last ? state.first : `${state.first}–${state.last}`} of {reviews.length}
        </p>
      </div>
      {/* Scroll indicator: thumb length = share in view, position = progress. */}
      <div className="mt-5 h-1 w-full max-w-[16rem] overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div
          className="h-full rounded-full bg-brand-500 transition-[margin] duration-150"
          style={{ width: `${thumb}%`, marginLeft: `${state.progress * (100 - thumb)}%` }}
        />
      </div>
    </div>
  );

  return (
    <section id="reviews" className="scroll-mt-20 pb-24 lg:pb-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          {/* Same white panel as before: heading left, airy quotes right. */}
          <div className="grid gap-10 rounded-[2rem] bg-white p-8 sm:p-12 lg:grid-cols-[1fr_2fr]">
            <div className="flex flex-col">
              <h2 className="font-display text-4xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-5xl">
                What our community is saying
              </h2>
              {controls}
            </div>

            {/* Desktop/tablet: a 2×2 grid of quotes in view (4 at once) that
                scrolls sideways a column at a time. Phone: one quote per view
                with the next peeking in. */}
            <div
              ref={railRef}
              role="region"
              aria-label="Customer reviews"
              tabIndex={0}
              className="grid min-w-0 snap-x snap-mandatory auto-cols-[85%] grid-flow-col grid-rows-1 gap-x-10 gap-y-12 overflow-x-auto scroll-smooth outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-brand-500 sm:auto-cols-[calc((100%-2.5rem)/2)] sm:grid-rows-2 [&::-webkit-scrollbar]:hidden"
            >
              {reviews.map((r) => (
                <figure key={r.id} className="snap-start">
                  <StarRating value={r.rating} readOnly size="sm" />
                  <blockquote className="mt-4">
                    <p className="line-clamp-4 font-display text-xl font-medium leading-snug tracking-tight text-slate-900 sm:text-2xl">
                      “{r.title || r.comment}”
                    </p>
                    {r.title && r.comment && (
                      <p className="mt-2 line-clamp-3 text-slate-600">{r.comment}</p>
                    )}
                  </blockquote>
                  <figcaption className="mt-4 truncate text-slate-600">
                    {r.customerName ?? "Customer"} · on{" "}
                    <Link href={`/products/${r.product.slug}`} className="underline-offset-4 hover:underline">
                      {r.product.name}
                    </Link>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
