"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import Reveal from "../shop/Reveal";
import PrintHeadline from "./PrintHeadline";
import { FILAMENTS, TOTAL_LAYERS, type PrintStatus } from "./heroPrintConfig";

// three.js only runs in the browser; the loading box keeps the stage's size.
const STAGE_CLASS =
  "order-2 h-[56svh] w-full lg:absolute lg:bottom-[20rem] lg:left-[calc(min(50%+400px,100%-240px)-340px)] lg:top-[6.5rem] lg:h-auto lg:w-[680px]";

const HeroFloatingPrint = dynamic(() => import("./HeroFloatingPrint"), {
  ssr: false,
  loading: () => null,
});

// Homepage hero: dark-to-light stage (CSS .hero-stage), a huge headline on the
// left, one floating 3D print on the right above a glowing print-bed ring, a
// frosted live-status card bottom-right. (No category row: "The collection"
// right below already offers the category filters.)
export default function HomeHero({ customQuoteHref }: { customQuoteHref: string | null }) {
  // three.js (~350 KB, seconds of CPU on phones) starts only once the page
  // has loaded and the browser is idle, so the headline, buttons and the rest
  // of the page are ready first. The scene then fades in where it always was.
  const [show3d, setShow3d] = useState(false);
  useEffect(() => {
    let idleId: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let raf = 0;
    let cancelled = false;
    const go = () => !cancelled && setShow3d(true);
    // Load event alone isn't enough: on a fast/cached load it can fire before
    // the first frame is painted. Two rAFs guarantee a painted frame, then
    // wait for idle so the scene never delays the headline.
    const afterPaint = () => {
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => {
          if ("requestIdleCallback" in window) {
            idleId = window.requestIdleCallback(go, { timeout: 3000 });
          } else {
            timer = setTimeout(go, 800);
          }
        });
      });
    };
    if (document.readyState === "complete") afterPaint();
    else window.addEventListener("load", afterPaint, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", afterPaint);
      cancelAnimationFrame(raf);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const [status, setStatus] = useState<PrintStatus>({
    layer: 0,
    total: TOTAL_LAYERS,
    printing: true,
    filament: FILAMENTS[0].name,
  });
  const pct = (status.layer / status.total) * 100;

  return (
    <section
      id="hero"
      className="hero-stage relative isolate flex flex-col overflow-hidden text-white lg:min-h-[100svh]"
    >
      {/* Copy — always first. */}
      <div className="pointer-events-none relative z-10 order-1 mx-auto w-full max-w-7xl px-5 pt-32 sm:px-8 lg:pt-[max(6.5rem,15svh)] [&_a]:pointer-events-auto">
        <div className="max-w-[54rem]">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
            3D printing studio · Made in India
          </p>

          <PrintHeadline
            className="mt-6 font-display font-semibold leading-[0.92] tracking-[-0.045em]"
            // Sized by the smaller of width and height so the whole hero fits one
            // screen on wide-but-short displays too.
            style={{ fontSize: "clamp(2.75rem, min(5.6vw, 9svh), 6rem)" }}
            lines={[
              { text: "Bring your ideas" },
              { text: "to life with" },
              { text: "premium 3D prints.", className: "text-brand-200" },
            ]}
          />

          <Reveal delay={1100}>
            <p className="mt-8 max-w-lg text-lg font-medium leading-relaxed text-slate-200">
              Personalized gifts, aesthetic decor, functional accessories,
              educational models, and one-of-a-kind custom creations.
            </p>
          </Reveal>

          <Reveal delay={1250}>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <a
                href="#shop"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-7 py-4 font-semibold text-slate-950 shadow-[0_12px_40px_-8px_rgba(16,185,129,.7)] transition hover:brightness-110 active:scale-[.97]"
              >
                Shop the catalog
                <span aria-hidden="true" className="transition group-hover:translate-x-1">→</span>
              </a>
              {customQuoteHref && (
                <a
                  href={customQuoteHref}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-white/80 underline-offset-4 transition hover:text-white hover:underline"
                >
                  or get a custom quote →
                </a>
              )}
            </div>
          </Reveal>
        </div>
      </div>

      {/* The floating print. Desktop: anchored to the centred content column
          (not the viewport), centred over the status card's column — clear
          of the headline — and ending above the card so the ring is never
          hidden behind it. Phone: its own block between copy and card. */}
      {/* The stage box is permanent, so its size never changes while the
          3D code downloads (next/dynamic's loading placeholder would collapse
          it and shift the card below). The scene fills it once ready. */}
      <div className={`relative ${STAGE_CLASS}`}>
        {show3d && <HeroFloatingPrint onStatus={setStatus} className="h-full w-full" />}
      </div>

      {/* In normal flow (mt-auto), never absolutely pinned: on short screens a
          pinned row collided with the buttons above it. */}
      <div className="relative z-10 order-3 mx-auto w-full max-w-7xl px-5 pb-10 sm:px-8 lg:mt-auto lg:pt-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-end">
          {/* Frosted live-status card */}
          {/* (Plain load-in, not Reveal: Reveal ignores the bottom 10% of the
              viewport, which is exactly where this row sits.) */}
          {/* xl+: pinned bottom-right so it never adds height (nothing else lives
              in that column at 1280px+); below xl it stays in the row. */}
          <div className="animate-fade-in-up lg:w-[360px] lg:shrink-0 xl:absolute xl:bottom-10 xl:right-8" style={{ animationDelay: "1650ms" }}>
            <div className="rounded-2xl bg-white/40 p-5 text-slate-900 ring-1 ring-white/60 backdrop-blur-xl sm:p-6">
              <p className="font-display text-base font-bold uppercase tracking-tight">Printed live, layer by layer</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                Every piece is modelled for you and printed to order.
              </p>
              <div className="mt-4 rounded-xl bg-slate-950/90 px-4 py-3 text-white" aria-live="off">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-brand-300">{status.printing ? "● PRINTING" : "✓ COMPLETE"}</span>
                  <span className="text-slate-400">{status.filament}</span>
                </div>
                <p className="mt-1.5 font-mono text-sm">
                  Layer <span className="tabular-nums">{String(status.layer).padStart(4, "0")}</span>/{status.total}
                </p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-brand-400" style={{ width: `${pct}%` }} />
                </div>
              </div>
              {customQuoteHref && (
                <a
                  href={customQuoteHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 active:scale-[.97]"
                >
                  Start a custom order →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
