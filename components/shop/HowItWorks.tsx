"use client";

import { Box, MessageCircle, Printer, Truck, type LucideIcon } from "lucide-react";

import Reveal from "./Reveal";

interface Step {
  num: string;
  icon: LucideIcon;
  title: string;
  copy: string;
}

const STEPS: Step[] = [
  {
    num: "01",
    icon: MessageCircle,
    title: "Share your idea",
    copy: "Reference photo, sketch, or rough description. WhatsApp or browse the catalog.",
  },
  {
    num: "02",
    icon: Box,
    title: "We model it",
    copy: "Our team turns it into a CAD-ready file, with a preview before you confirm.",
  },
  {
    num: "03",
    icon: Printer,
    title: "We print",
    copy: "Crafted on studio-grade printers and finished by hand — every piece checked before shipping.",
  },
  {
    num: "04",
    icon: Truck,
    title: "Door delivery",
    copy: "Polished, packed, and shipped across India — most orders within 24–72 hours.",
  },
];

// 4-step process strip that sells the *service*, not just the products. The
// connector lines between steps reinforce a "pipeline" feel, which is the
// thing most generic e-commerce sections never communicate.
export default function HowItWorks() {
  return (
    <section className="relative bg-slate-50 py-16 lg:py-24">
      <div className="bg-layer-lines pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="mb-12 text-center">
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-brand-700">
              <span className="h-px w-6 bg-brand-600" />
              How it works
              <span className="h-px w-6 bg-brand-600" />
            </p>
            <h2
              className="font-black tracking-tight text-slate-900"
              style={{ fontSize: "clamp(1.75rem, 2.5vw + 0.75rem, 2.75rem)" }}
            >
              From sketch to your door
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-slate-500">
              Every order — stock or custom — moves through the same four
              stages. No middlemen, no surprises.
            </p>
          </div>
        </Reveal>

        <div className="relative">
          {/* Dashed connector line across desktop — sits behind the cards */}
          <div
            aria-hidden="true"
            className="absolute left-[12%] right-[12%] top-[3.25rem] hidden h-px lg:block"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to right, rgba(15,23,42,0.18) 0 8px, transparent 8px 16px)",
            }}
          />

          <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <Reveal key={step.num} delay={idx * 80}>
                  <li className="relative flex h-full flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lift">
                    {/* Step number — mono, top right */}
                    <span className="font-spec absolute right-4 top-4 text-[11px] font-bold tracking-wider text-slate-300">
                      {step.num}
                    </span>

                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-600/15">
                      <Icon className="h-5 w-5" strokeWidth={1.8} />
                    </div>

                    <h3 className="text-base font-bold tracking-tight text-slate-900">
                      {step.title}
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                      {step.copy}
                    </p>
                  </li>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
