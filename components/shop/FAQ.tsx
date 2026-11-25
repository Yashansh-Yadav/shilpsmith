"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import Reveal from "./Reveal";
import { FAQ_ITEMS } from "../../lib/faq";

// Storefront FAQ.
//
// Two jobs in one component:
//   1. A human-friendly accordion styled to the site's design tokens.
//   2. FAQPage JSON-LD structured data — this is what answer engines (ChatGPT,
//      Gemini, Perplexity, Google AI Overviews) parse to quote us directly.
//
// Two deliberate choices support #2:
//   - The <script type="application/ld+json"> is rendered from this component,
//     which is server-rendered into the initial HTML on first load (Next SSRs
//     "use client" components too), so bots that don't run JS still see it.
//   - Every answer stays in the DOM even when its panel is visually collapsed
//     (we animate height, we don't unmount), so the visible copy always matches
//     the structured data — a requirement for FAQ rich results.
export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <section id="faq" className="scroll-mt-20 bg-white py-24 lg:py-32">
      {/* Structured data for answer engines / search rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[2fr_3fr]">
        <Reveal>
          <h2 className="font-display text-5xl font-semibold tracking-[-0.035em] text-slate-900 sm:text-6xl">
            Questions, answered
          </h2>
          <p className="mt-5 max-w-sm text-lg text-slate-600">
            Everything about custom orders, materials, delivery, and how
            ShilpSmith works.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <dl className="divide-y divide-slate-200 border-y border-slate-200">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = open === idx;
              return (
                <div key={item.q}>
                  <dt>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-6 py-6 text-left"
                    >
                      <span className="font-display text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                        {item.q}
                      </span>
                      <span
                        className={`grid h-10 w-10 flex-none place-items-center rounded-full transition duration-300 ${
                          isOpen ? "rotate-45 bg-brand-500 text-slate-950" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        <Plus className="h-5 w-5" strokeWidth={2} />
                      </span>
                    </button>
                  </dt>
                  {/*
                    Height-animated wrapper. The answer is ALWAYS rendered so it
                    stays in the DOM for crawlers; the grid-rows trick collapses
                    it visually without unmounting.
                  */}
                  <dd
                    className={`grid transition-all duration-300 ease-out ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-2xl pb-6 text-lg leading-relaxed text-slate-600">
                        {item.a}
                      </p>
                    </div>
                  </dd>
                </div>
              );
            })}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
