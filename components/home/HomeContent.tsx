// Server component on purpose: only the interactive sections below (hero,
// collection filters, process steps, reviews rail, FAQ, header, cart) ship
// JavaScript. The static ones — Smart Idols band, category rows, Meet the
// maker, custom-order band, footer — render to HTML only.

import Link from "next/link";

import { whatsappLink } from "../../lib/site";
import type { StorefrontData, StorefrontCard } from "../../lib/storefront";
import StorefrontChrome from "../shop/StorefrontChrome";
import Reveal from "../shop/Reveal";
import FAQ from "../shop/FAQ";
import SiteFooter from "../site/SiteFooter";
import SiteHeader from "../site/SiteHeader";
import HomeHero from "./HomeHero";
import CollectionShowcase from "./CollectionShowcase";
import SmartIdolsBand from "./SmartIdolsBand";
import ProcessSteps from "./ProcessSteps";
import CategoryRows from "./CategoryRows";
import MeetTheMaker from "./MeetTheMaker";
import CustomOrderBand from "./CustomOrderBand";
import ReviewsRail from "./ReviewsRail";

// Data arrives as a prop from the server component in app/page.tsx, already
// resolved — every section is in the first HTML response, which keeps the
// catalogue visible to crawlers that don't execute JavaScript.
export default function HomeContent({ data }: { data: StorefrontData }) {
  const waPlain = whatsappLink();
  const waCustom = whatsappLink("Hi I want a custom 3D printed product");
  const waCreate = whatsappLink("Hi I want to create a custom 3D printed product");

  // Featured / newest / trending overlap heavily on a small catalogue, so the
  // homepage shows each product once: featured first, then the rest.
  const seen = new Set<number>();
  const products: StorefrontCard[] = [];
  for (const p of [...data.featured, ...data.newest, ...data.trending]) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      products.push(p);
    }
  }

  return (
    <main className="bg-slate-50 text-slate-900">
      <SiteHeader variant="overlay" />
      {/* Below-the-fold sections are wrapped in .cv-auto (content-visibility:
          auto): the browser skips their style/layout/paint until they're
          scrolled near, which removes most of the first-paint work on phones.
          No visual change. */}

      <HomeHero customQuoteHref={waCustom} />

      {products.length > 0 ? (
        <CollectionShowcase products={products} />
      ) : (
        <section id="shop" className="py-24 text-center lg:py-32">
          <h2 className="font-display text-5xl font-semibold tracking-[-0.035em]">The collection</h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-slate-600">
            The first pieces are still in the studio. Commission one yourself in the meantime.
          </p>
        </section>
      )}

      <div className="cv-auto"><SmartIdolsBand products={products} /></div>
      <div className="cv-auto"><ProcessSteps /></div>
      <div className="cv-auto"><CategoryRows categories={data.categories} /></div>
      <div className="cv-auto"><MeetTheMaker /></div>
      <div className="cv-auto"><CustomOrderBand whatsappHref={waCreate} /></div>

      <div className="cv-auto"><ReviewsRail reviews={data.testimonials} /></div>

      <div className="cv-auto"><FAQ /></div>

      {/* ─────────────────────────── Final CTA ─────────────────────────── */}
      <section className="cv-auto relative isolate overflow-hidden bg-slate-950 py-28 text-center text-white">
        <div aria-hidden="true" className="heated-bed absolute inset-0 -z-10" />
        <div className="mx-auto max-w-4xl px-5">
          <Reveal>
            <h2 className="font-display text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-7xl">
              Ready to create something unique?
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
              Browse inspiration, customize your design, and place your order
              directly through WhatsApp.
            </p>
            {waPlain ? (
              <a
                href={waPlain}
                target="_blank"
                rel="noreferrer"
                className="mt-10 inline-flex rounded-full bg-white px-8 py-4 font-semibold text-slate-950 transition hover:bg-brand-100 active:scale-[.97]"
              >
                Order via WhatsApp
              </a>
            ) : (
              // No WhatsApp configured — still give the section an action.
              <Link
                href="/search"
                className="mt-10 inline-flex rounded-full bg-white px-8 py-4 font-semibold text-slate-950 transition hover:bg-brand-100"
              >
                Browse the catalog
              </Link>
            )}
          </Reveal>
        </div>
      </section>

      <div className="cv-auto"><SiteFooter /></div>

      {/* Cart drawer + toast host (client-only). */}
      <StorefrontChrome />
    </main>
  );
}
