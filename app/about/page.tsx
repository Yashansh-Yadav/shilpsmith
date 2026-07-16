import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

import PageShell from "../../components/site/PageShell";
import { PageHeader } from "../../components/site/Prose";
import {
  SITE_NAME,
  SITE_LEGAL_NAME,
  BUSINESS_COUNTRY,
  whatsappLink,
} from "../../lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description: `Learn about ${SITE_LEGAL_NAME} — a custom 3D-printing studio crafting premium personalized gifts, decor, and made-to-order products in ${BUSINESS_COUNTRY}.`,
  alternates: { canonical: "/about" },
};

const VALUES = [
  {
    icon: "✍️",
    title: "Truly custom",
    copy: "Engrave names, choose colors, and tweak dimensions. Every piece is made to your brief, not pulled off a shelf.",
  },
  {
    icon: "⚡",
    title: "Made on demand",
    copy: "We print to order — minimizing waste and letting us offer designs that would never survive mass production.",
  },
  {
    icon: "🌿",
    title: "Premium materials",
    copy: "Durable, heat-resistant PETG and PLA finishes built to last through Indian summers and daily handling.",
  },
  {
    icon: "💬",
    title: "Human support",
    copy: "Real people on WhatsApp for design help, order updates, and after-sales care — start to finish.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Share your idea",
    copy: "Browse the catalog or send us a sketch, photo, or reference for a custom commission.",
  },
  {
    n: "02",
    title: "We design & preview",
    copy: "We refine the model and confirm colors, size, and personalization before anything is printed.",
  },
  {
    n: "03",
    title: "Crafted & delivered",
    copy: "Your piece is printed, quality-checked, and shipped across India to your door.",
  },
];

export default function AboutPage() {
  const waLink = whatsappLink(
    "Hi! I'd like to start a custom 3D printed product."
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="Our story"
        title={`About ${SITE_NAME}`}
        intro={`${SITE_LEGAL_NAME} is a 3D-printing studio that turns ideas into premium, personalized objects — from keepsake gifts and home decor to functional accessories and one-off custom commissions, all crafted on demand in ${BUSINESS_COUNTRY}.`}
      />

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="text-[15px] leading-relaxed text-slate-700">
          <p>
            {SITE_NAME} started with a simple belief: the things you keep and
            gift should feel personal. 3D printing lets us make exactly that —
            objects designed around a name, a moment, or a need, produced one at
            a time with care rather than stamped out by the thousand.
          </p>
          <p className="mt-4">
            Whether it&apos;s a personalized gift, a piece of aesthetic decor, an
            educational model, or a fully bespoke commission, our team works with
            you from concept to finished product. We sweat the details — material
            choice, finish, durability — so what arrives is something you&apos;re
            proud to own or give.
          </p>
        </div>

        {/* Values */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="rounded-3xl border border-slate-100 bg-slate-50/60 p-6"
            >
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm ring-1 ring-slate-100">
                {v.icon}
              </div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                {v.title}
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {v.copy}
              </p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <h2 className="mt-14 text-xl font-bold tracking-tight text-slate-900">
          How it works
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="rounded-3xl border border-slate-100 p-6"
            >
              <p className="font-spec text-2xl font-black text-brand-600">
                {s.n}
              </p>
              <h3 className="mt-2 text-sm font-bold text-slate-900">
                {s.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {s.copy}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-14 flex flex-col gap-3 rounded-4xl bg-slate-900 p-8 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              Have an idea? We&apos;ll print it.
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Browse the catalog or start a custom order today.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5"
            >
              Shop the catalog
              <ArrowRight className="h-4 w-4" />
            </Link>
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-brand-700"
              >
                <MessageCircle className="h-4 w-4" />
                Custom quote
              </a>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
