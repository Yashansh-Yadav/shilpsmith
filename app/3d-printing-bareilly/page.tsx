// app/3d-printing-bareilly/page.tsx
//
// Local landing page: the page we want ranking for "3D printing in Bareilly"
// and quoted when someone asks an AI assistant for a 3D printing service in
// the city. Search engines need one URL whose title, H1, copy and structured
// data are all clearly about Bareilly; the homepage serves the whole country
// and can't do that job too.
//
// GENUINE DATA ONLY, same rule as lib/faq.ts: every claim here is already made
// elsewhere on the site (studio location, WhatsApp-first custom flow, free
// consultation, materials, shipping windows from /shipping-returns). Don't add
// local promises (pickup, same-day delivery, walk-ins) unless the business
// really offers them. Answer engines quote this copy word for word.

import Link from "next/link";
import type { Metadata } from "next";

import PageShell from "../../components/site/PageShell";
import Reveal from "../../components/shop/Reveal";
import SectionHeader from "../../components/shop/SectionHeader";
import ProductCarousel from "../../components/shop/ProductCarousel";
import { getStorefrontData } from "../../lib/storefront";
import {
  SITE_URL,
  SITE_NAME,
  SITE_LEGAL_NAME,
  BUSINESS_ADDRESS,
  BUSINESS_ADDRESS_LINE,
  BUSINESS_PHONE,
  BUSINESS_PHONE_E164,
  FOUNDER_NAME,
  LOCAL_PAGE_PATH,
  whatsappLink,
} from "../../lib/site";

const CITY = BUSINESS_ADDRESS.city;

export const metadata: Metadata = {
  // Bare title; the root template appends "· ShilpSmith".
  title: `3D Printing Service in ${CITY} — Custom Gifts, Decor & Prototypes`,
  description: `${SITE_LEGAL_NAME} is a 3D printing studio in ${CITY}, ${BUSINESS_ADDRESS.state}. Custom 3D-printed gifts, decor, idols and one-off designs, made to order in ${CITY} and shipped across India. Free design consultation on WhatsApp.`,
  alternates: { canonical: LOCAL_PAGE_PATH },
  openGraph: {
    title: `3D Printing in ${CITY} · ${SITE_NAME}`,
    url: LOCAL_PAGE_PATH,
  },
};

// Same 1-minute window as the homepage, which shares this data loader.
export const revalidate = 60;

// Written to stand alone (each answer names ShilpSmith and Bareilly) so an
// answer engine can quote one without the rest of the page.
const LOCAL_FAQ = [
  {
    q: `Is there a 3D printing service in ${CITY}?`,
    a: `Yes. ShilpSmith is a 3D printing studio based in ${CITY}, ${BUSINESS_ADDRESS.state}. It designs and 3D-prints personalized gifts, home decor, idols, functional parts and fully custom pieces, all made to order in the ${CITY} studio.`,
  },
  {
    q: `How do I get something custom 3D printed in ${CITY}?`,
    a: `Message ShilpSmith on WhatsApp with a photo, sketch or description of what you want. The studio turns it into a 3D model, shows you a preview to approve, and only then prints it. The design consultation is free and no deposit is needed to start.`,
  },
  {
    q: "What can ShilpSmith 3D print?",
    a: "ShilpSmith makes personalized gifts and name plates, aesthetic home decor, Smart NFC idols, functional accessories, educational models and one-off custom commissions. If you can describe or sketch it, the studio can usually design and print it.",
  },
  {
    q: "What materials does ShilpSmith print with?",
    a: "ShilpSmith prints mainly with PLA, a plant-based filament with an excellent finish, and PETG where a piece needs extra strength or heat resistance. The material is chosen per product based on how it will be used.",
  },
  {
    q: `Does ShilpSmith deliver outside ${CITY}?`,
    a: `Yes. ShilpSmith ships from ${CITY} to customers across India. Most standard pieces are dispatched within 1–3 business days of order confirmation, and delivery usually takes another 3–7 business days depending on location.`,
  },
  {
    q: `Can a ${CITY} business or event order in bulk?`,
    a: `Yes. Because every ShilpSmith piece is made to order, the ${CITY} studio takes bulk and corporate gifting orders. Share your quantity and timeline on WhatsApp to plan it.`,
  },
];

const STEPS = [
  {
    title: "Share your idea",
    body: "Send a photo, sketch or a few words on WhatsApp. Consultation is free.",
  },
  {
    title: "Approve a preview",
    body: "We model it in 3D and show you before anything is printed.",
  },
  {
    title: "Printed in Bareilly",
    body: "Printed, finished and quality-checked by hand in our studio, then shipped.",
  },
];

export default async function LocalPage() {
  const data = await getStorefrontData();
  const categories = data.categories.filter((c) => c.productCount > 0);
  const waLink = whatsappLink(
    `Hi ShilpSmith! I'm in ${CITY} and want something custom 3D printed.`
  );

  const pageUrl = `${SITE_URL}${LOCAL_PAGE_PATH}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${pageUrl}#service`,
        name: `3D printing service in ${CITY}`,
        serviceType: "3D printing",
        url: pageUrl,
        // Points at the LocalBusiness entity in the root layout, so this page
        // reinforces one business instead of describing a second one.
        provider: { "@id": `${SITE_URL}/#organization` },
        areaServed: [
          { "@type": "City", name: CITY },
          { "@type": "Country", name: BUSINESS_ADDRESS.country },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${pageUrl}#faq`,
        mainEntity: LOCAL_FAQ.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: `3D printing in ${CITY}`,
            item: pageUrl,
          },
        ],
      },
    ],
  };

  const heading =
    "font-display text-4xl font-semibold tracking-[-0.035em] text-slate-900 sm:text-5xl";
  const eyebrow =
    "font-mono text-xs font-medium uppercase tracking-[0.18em] text-brand-700";

  return (
    <PageShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <div aria-hidden="true" className="plate-grid absolute inset-0 -z-10" />
        <div aria-hidden="true" className="heated-bed absolute inset-0 -z-10" />
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-brand-300">
            {CITY}, {BUSINESS_ADDRESS.state}
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            3D printing in {CITY}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            {SITE_LEGAL_NAME} is a 3D printing studio in {CITY}. We design and
            print personalized gifts, home decor, idols and fully custom
            pieces, one at a time, and ship them across India. Talk directly to
            the maker, not a call centre.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <a
              href={waLink ?? "/contact"}
              {...(waLink ? { target: "_blank", rel: "noreferrer" } : {})}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-7 py-4 font-semibold text-slate-950 transition hover:brightness-110 active:scale-[.97]"
            >
              Start a custom order →
            </a>
            <Link
              href="/search"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-7 py-4 font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15 active:scale-[.97]"
            >
              Shop ready-made →
            </Link>
          </div>
        </div>
      </section>

      {/* How custom orders work */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <p className={eyebrow}>How it works</p>
        <h2 className={`mt-4 ${heading}`}>Custom 3D printing, made in {CITY}</h2>
        <ol className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Reveal
                delay={i * 80}
                className="h-full rounded-[2rem] bg-white p-8 ring-1 ring-slate-200/70"
              >
                <p className="font-mono text-sm text-brand-700">0{i + 1}</p>
                <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-900">
                  {s.title}
                </h3>
                <p className="mt-3 leading-relaxed text-slate-600">{s.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* Real catalog: shows the studio's actual work, not stock copy */}
      {data.trending.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:pb-28">
          <SectionHeader
            eyebrow={`Made in ${CITY}`}
            title="Popular from the studio"
            href="/search"
            ctaLabel="View all"
          />
          <ProductCarousel
            products={data.trending}
            cardWidthClass="w-[240px] sm:w-[260px] lg:w-[280px]"
          />
          {categories.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-3">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/categories/${c.slug}`}
                  className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200/70 transition hover:ring-brand-400"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Local FAQ: visible copy must match the FAQPage JSON-LD above */}
      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[2fr_3fr]">
          <div>
            <p className={eyebrow}>FAQ</p>
            <h2 className={`mt-4 ${heading}`}>3D printing in {CITY}, answered</h2>
          </div>
          <dl className="divide-y divide-slate-200">
            {LOCAL_FAQ.map((f) => (
              <div key={f.q} className="py-6 first:pt-0">
                <dt className="font-display text-xl font-semibold tracking-tight text-slate-900">
                  {f.q}
                </dt>
                <dd className="mt-3 leading-relaxed text-slate-600">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* NAP block: name, address, phone, matching the JSON-LD and the
          Google Business Profile word for word. */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="rounded-[2rem] bg-white p-8 ring-1 ring-slate-200/70 sm:p-12">
          <p className={eyebrow}>Find us</p>
          <h2 className={`mt-4 ${heading}`}>Our {CITY} studio</h2>
          <address className="mt-6 not-italic text-lg leading-relaxed text-slate-700">
            <strong className="text-slate-900">{SITE_LEGAL_NAME}</strong>
            <br />
            {BUSINESS_ADDRESS_LINE}
            <br />
            <a
              href={`tel:${BUSINESS_PHONE_E164}`}
              className="font-mono font-semibold text-brand-700 underline underline-offset-4"
            >
              {BUSINESS_PHONE}
            </a>
          </address>
          <p className="mt-6 max-w-2xl text-slate-600">
            Run by {FOUNDER_NAME}. Every order is designed, printed and finished
            in {CITY}.{" "}
            <Link href="/about" className="font-medium text-brand-700 underline underline-offset-4">
              Read our story
            </Link>
            .
          </p>
        </div>
      </section>
    </PageShell>
  );
}
