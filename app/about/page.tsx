import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";

import PageShell from "../../components/site/PageShell";
import { PageHeader } from "../../components/site/Prose";
import {
  SITE_NAME,
  SITE_LEGAL_NAME,
  BUSINESS_COUNTRY,
  FOUNDER_NAME,
  FOUNDER_ROLE,
  FOUNDER_PHOTO,
  BUSINESS_ADDRESS,
  BUSINESS_ADDRESS_LINE,
  BUSINESS_PHONE,
  BUSINESS_PHONE_E164,
  SUPPORT_EMAIL,
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

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-10 lg:grid-cols-[2fr_3fr] lg:gap-20">
          <h2 className="font-display text-4xl font-semibold tracking-[-0.035em] text-slate-900 sm:text-5xl">
            Made to feel personal
          </h2>
          <div className="space-y-5 text-lg leading-relaxed text-slate-700">
            <p>
              {SITE_NAME} started with a simple belief: the things you keep and
              gift should feel personal. 3D printing lets us make exactly that —
              objects designed around a name, a moment, or a need, produced one
              at a time with care rather than stamped out by the thousand.
            </p>
            <p>
              Whether it&apos;s a personalized gift, a piece of aesthetic decor,
              an educational model, or a fully bespoke commission, our team works
              with you from concept to finished product. We sweat the details —
              material choice, finish, durability — so what arrives is something
              you&apos;re proud to own or give.
            </p>
          </div>
        </div>
      </section>

      {/*
        Who's actually behind the studio. Until this existed the whole site was
        anonymous — no name, no location — which is the weakest possible trust
        signal for a made-to-order business asking for payment up front.

        Kept strictly to verified facts: name, role, and where the studio
        operates from. No invented founding story and no fabricated quote —
        if a personal note is wanted here, it should be the founder's own words.
      */}
      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[5fr_7fr] lg:gap-20">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-slate-950">
            {FOUNDER_PHOTO ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={FOUNDER_PHOTO}
                alt={`${FOUNDER_NAME}, ${FOUNDER_ROLE.toLowerCase()} of ${SITE_LEGAL_NAME}`}
                loading="lazy"
                className="h-full w-full object-cover object-top"
              />
            ) : (
              <span
                aria-hidden
                className="absolute inset-0 grid place-items-center font-display text-[8rem] font-semibold tracking-[-0.06em] text-brand-400"
              >
                {FOUNDER_NAME.split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")}
              </span>
            )}
          </div>

          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-brand-700">
              The maker
            </p>
            <h2 className="mt-4 font-display text-4xl font-semibold tracking-[-0.035em] text-slate-900 sm:text-5xl">
              {FOUNDER_NAME}
            </h2>
            <p className="mt-2 text-lg text-slate-600">
              {FOUNDER_ROLE}, {SITE_LEGAL_NAME}
            </p>
            <p className="mt-8 text-lg leading-relaxed text-slate-700">
              {SITE_NAME} is run by {FOUNDER_NAME} from the studio in{" "}
              {BUSINESS_ADDRESS.city}, {BUSINESS_ADDRESS.state}. Every order is
              designed, printed, and quality-checked here before it ships — so
              when you ask a question over WhatsApp or raise a concern,
              you&apos;re talking to the person who made your piece, not a call
              centre.
            </p>
            <dl className="mt-10 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-5">
                <dt className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                  Studio
                </dt>
                <dd className="mt-2 font-semibold text-slate-900">
                  <address className="not-italic">{BUSINESS_ADDRESS_LINE}</address>
                </dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <dt className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                  Talk to us
                </dt>
                <dd className="mt-2 font-semibold text-slate-900">
                  <a
                    href={`tel:${BUSINESS_PHONE_E164}`}
                    className="font-mono transition hover:text-brand-700"
                  >
                    {BUSINESS_PHONE}
                  </a>
                  {SUPPORT_EMAIL && (
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="mt-1 block transition hover:text-brand-700"
                    >
                      {SUPPORT_EMAIL}
                    </a>
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <h2 className="font-display text-4xl font-semibold tracking-[-0.035em] text-slate-900 sm:text-5xl">
          What we stand for
        </h2>
        <dl className="mt-12 grid gap-x-12 gap-y-10 border-t border-slate-200 pt-10 sm:grid-cols-2">
          {VALUES.map((v) => (
            <div key={v.title}>
              <dt className="font-display text-2xl font-semibold tracking-tight text-slate-900">
                {v.title}
              </dt>
              <dd className="mt-3 max-w-md text-lg leading-relaxed text-slate-600">
                {v.copy}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* How it works */}
      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <h2 className="font-display text-4xl font-semibold tracking-[-0.035em] text-slate-900 sm:text-5xl">
            How it works
          </h2>
          <ol className="mt-12 grid gap-5 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="rounded-[2rem] bg-slate-50 p-8">
                <p className="font-mono text-sm text-brand-700">{s.n}</p>
                <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-900">
                  {s.title}
                </h3>
                <p className="mt-3 text-lg leading-relaxed text-slate-600">
                  {s.copy}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="relative isolate overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-white sm:p-12 lg:p-16">
          <div aria-hidden="true" className="plate-grid absolute inset-0 -z-10 opacity-60" />
          <div aria-hidden="true" className="heated-bed absolute inset-0 -z-10" />
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="font-display text-4xl font-semibold leading-[0.95] tracking-[-0.035em] sm:text-5xl">
                Have an idea?
                <br />
                <span className="text-brand-300">We&apos;ll print it.</span>
              </h2>
              <p className="mt-4 text-lg text-slate-300">
                Browse the catalog or start a custom order today.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-4 font-semibold text-slate-900 transition hover:bg-brand-50 active:scale-[.97]"
              >
                Shop the catalog
                <ArrowRight className="h-4 w-4" />
              </Link>
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-7 py-4 font-semibold text-slate-950 transition hover:brightness-110 active:scale-[.97]"
                >
                  <MessageCircle className="h-4 w-4" />
                  Custom quote
                </a>
              )}
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
