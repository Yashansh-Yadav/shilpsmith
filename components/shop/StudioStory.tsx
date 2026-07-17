"use client";

import { Boxes, PenTool, Sparkles } from "lucide-react";

import Reveal from "./Reveal";

// "Made in our studio" — owns the 3D-printing-as-craft story head-on.
//
// Every claim here is already true and consistent with the rest of the site
// (a made-to-order 3D printing studio in India, model-then-preview-then-print).
// No numbers, no track record, no social proof — just what we do and how.
//
// It doubles as an "about" answer that answer engines can quote when someone
// asks a chatbot "what is ShilpSmith / how does ShilpSmith make its products".
const PILLARS = [
  {
    icon: PenTool,
    title: "Modeled with you",
    copy: "Bring a photo, sketch, or idea. We turn it into a 3D model and show you a preview before anything is printed.",
  },
  {
    icon: Boxes,
    title: "Printed to order",
    copy: "Nothing sits in a warehouse. Your piece is printed when you order it — one at a time, not ten thousand at a time.",
  },
  {
    icon: Sparkles,
    title: "Finished by hand",
    copy: "Every print is cleaned up, hand-finished, and checked before it's packed and shipped across India.",
  },
];

export default function StudioStory() {
  return (
    <section id="studio" className="bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-brand-700">
              <span className="h-px w-6 bg-brand-600" />
              Our craft
              <span className="h-px w-6 bg-brand-600" />
            </p>
            <h2
              className="font-black tracking-tight text-slate-900"
              style={{ fontSize: "clamp(1.75rem, 2.5vw + 0.75rem, 2.75rem)" }}
            >
              Made in our studio, printed for you
            </h2>
            <p className="mx-auto mt-4 text-base leading-relaxed text-slate-600">
              ShilpSmith is a 3D printing studio — and that&apos;s exactly what
              lets us make things you can&apos;t buy off a shelf. A piece modeled
              around your idea, your name, your dimensions, produced on demand
              instead of mass-produced. Whether it&apos;s a gift, a bit of decor,
              a functional part, or a fully custom commission, you get the same
              thing: precision, personalization, and a piece made to order.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {PILLARS.map((p, idx) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.title} delay={idx * 80}>
                <div className="group h-full rounded-3xl border border-slate-100 bg-slate-50/60 p-6 transition hover:-translate-y-1 hover:border-brand-200 hover:bg-white hover:shadow-lift">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm ring-1 ring-slate-100 transition group-hover:ring-brand-200">
                    <Icon className="h-5 w-5" strokeWidth={1.8} />
                  </div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900">
                    {p.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {p.copy}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
