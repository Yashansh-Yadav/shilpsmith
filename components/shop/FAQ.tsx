"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import Reveal from "./Reveal";
import SectionHeader from "./SectionHeader";
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
    <section id="faq" className="bg-slate-50 py-16 lg:py-24">
      {/* Structured data for answer engines / search rich results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeader
            eyebrow="Good to know"
            title="Frequently asked questions"
            subtitle="Everything about custom orders, materials, delivery, and how ShilpSmith works."
          />
        </Reveal>

        <Reveal delay={80}>
          <dl className="divide-y divide-slate-200 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = open === idx;
              return (
                <div key={item.q}>
                  <dt>
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-slate-50 sm:px-6"
                    >
                      <span className="text-base font-semibold tracking-tight text-slate-900">
                        {item.q}
                      </span>
                      <Plus
                        className={`h-5 w-5 flex-none text-brand-600 transition-transform duration-300 ${
                          isOpen ? "rotate-45" : "rotate-0"
                        }`}
                        strokeWidth={2}
                      />
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
                      <p className="px-5 pb-5 text-sm leading-relaxed text-slate-600 sm:px-6">
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
