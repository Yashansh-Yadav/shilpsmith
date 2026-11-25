"use client";

import { useEffect, useRef, useState } from "react";

import Reveal from "../shop/Reveal";

const STEPS = [
  {
    title: "Share your idea",
    copy: "Reference photo, sketch, or rough description. WhatsApp or browse the catalog.",
  },
  {
    title: "We model it",
    copy: "Our team turns it into a CAD-ready file, with a preview before you confirm.",
  },
  {
    title: "We print",
    copy: "Crafted on studio-grade printers and finished by hand — every piece checked before shipping.",
  },
  {
    title: "Door delivery",
    copy: "Polished, packed, and shipped across India — most orders within 24–72 hours.",
  },
];

const TOTAL_LAYERS = 1200;
// Widths (%) of the layer bands that make up the little part on the readout.
// Rounded so server and client serialise the same style string (hydration).
const BANDS = Array.from({ length: 40 }, (_, k) => {
  const t = k / 39;
  return Math.round((30 + Math.sin(t * Math.PI) * 55 + (t < 0.15 ? 10 : 0)) * 10) / 10;
});

// "From idea to your door": the four steps scroll past a sticky build readout.
// As each step reaches the middle of the screen, the part on the readout gains
// a quarter of its layers and the layer counter climbs.
export default function ProcessSteps() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        }),
      { rootMargin: "-45% 0px -45% 0px" }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const progress = (active + 1) / STEPS.length;
  const upto = Math.round(progress * BANDS.length);

  return (
    <section id="process" className="bg-white py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-16 px-5 sm:px-8 lg:grid-cols-2">
        <div className="lg:sticky lg:top-28 lg:h-fit">
          <Reveal>
            <h2 className="font-display text-5xl font-semibold tracking-[-0.035em] text-slate-900 sm:text-6xl">
              From idea
              <br />
              to your door
            </h2>
            <p className="mt-5 max-w-md text-lg text-slate-600">
              Four steps. You see a preview before a single layer is printed.
            </p>
          </Reveal>

          <div className="mt-12 hidden rounded-[2rem] bg-slate-950 p-8 text-white lg:block" aria-hidden="true">
            <div className="flex items-center justify-between font-mono text-sm">
              <span className="text-brand-300">● BUILD</span>
              <span>
                Layer <span className="tabular-nums">{String(Math.round(progress * TOTAL_LAYERS)).padStart(4, "0")}</span> / {TOTAL_LAYERS}
              </span>
            </div>
            <div className="mt-8 flex h-56 flex-col-reverse items-center gap-[3px]">
              {BANDS.map((w, k) => (
                <div
                  key={k}
                  className={`h-[3px] rounded-full transition-colors duration-500 ${k < upto ? "bg-brand-400" : "bg-white/10"}`}
                  style={{ width: `${w}%`, transitionDelay: `${(k % 10) * 25}ms` }}
                />
              ))}
            </div>
            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-brand-400 transition-all duration-500" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        </div>

        <ol className="space-y-6">
          {STEPS.map((s, k) => {
            const on = k === active;
            return (
              <li
                key={s.title}
                data-step={k}
                ref={(el) => {
                  refs.current[k] = el;
                }}
                className={`rounded-[2rem] p-8 transition duration-500 sm:p-10 ${on ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}
              >
                <p className={`font-mono text-sm ${on ? "text-brand-300" : "text-brand-700"}`}>
                  {String(k + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{s.title}</h3>
                <p className={`mt-3 max-w-md text-lg ${on ? "text-slate-300" : "text-slate-600"}`}>{s.copy}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
