"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Toaster } from "react-hot-toast";

import { whatsappLink } from "../../lib/site";
import type { StorefrontData, StorefrontCard } from "../../lib/storefront";
import CartSheet from "../shop/CartSheet";
import Reveal from "../shop/Reveal";
import StarRating from "../shop/StarRating";
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

// Data arrives as a prop from the server component in app/page.tsx, already
// resolved — every section is in the first HTML response, which keeps the
// catalogue visible to crawlers that don't execute JavaScript.
export default function HomeContent({ data }: { data: StorefrontData }) {
  const waPlain = whatsappLink();
  const waCustom = whatsappLink("Hi I want a custom 3D printed product");
  const waCreate = whatsappLink("Hi I want to create a custom 3D printed product");

  // Featured / newest / trending overlap heavily on a small catalogue, so the
  // homepage shows each product once: featured first, then the rest.
  const products = useMemo(() => {
    const seen = new Set<number>();
    const out: StorefrontCard[] = [];
    for (const p of [...data.featured, ...data.newest, ...data.trending]) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        out.push(p);
      }
    }
    return out;
  }, [data]);

  return (
    <main className="bg-slate-50 text-slate-900">
      <SiteHeader variant="overlay" />

      <HomeHero categories={data.categories} customQuoteHref={waCustom} />

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

      <SmartIdolsBand products={products} />
      <ProcessSteps />
      <CategoryRows categories={data.categories} />
      <MeetTheMaker />
      <CustomOrderBand whatsappHref={waCreate} />

      {/* ─────────────────────────── Reviews ─────────────────────────── */}
      {data.testimonials.length > 0 && (
        <section id="reviews" className="pb-24 lg:pb-32">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <Reveal>
              <div className="grid items-start gap-10 rounded-[2rem] bg-white p-8 sm:p-12 lg:grid-cols-[1fr_2fr]">
                <h2 className="font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
                  What our community is saying
                </h2>
                <div className="-mx-2 flex snap-x snap-mandatory gap-10 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {data.testimonials.map((r) => (
                    <figure key={r.id} className="w-full flex-none snap-start sm:w-[min(100%,28rem)]">
                      <StarRating value={r.rating} readOnly size="sm" />
                      <blockquote className="mt-4 font-display text-2xl font-medium leading-snug tracking-tight sm:text-3xl">
                        “{r.title || r.comment}”
                      </blockquote>
                      {r.title && r.comment && <p className="mt-3 text-slate-600">{r.comment}</p>}
                      <figcaption className="mt-4 text-slate-600">
                        {r.customerName ?? "Customer"} · on{" "}
                        <Link href={`/products/${r.product.slug}`} className="underline-offset-4 hover:underline">
                          {r.product.name}
                        </Link>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      <FAQ />

      {/* ─────────────────────────── Final CTA ─────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-slate-950 py-28 text-center text-white">
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

      <SiteFooter />

      <CartSheet />
      <Toaster />
    </main>
  );
}
