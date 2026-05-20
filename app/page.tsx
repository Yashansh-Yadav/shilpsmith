"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";
import {
  ArrowRight,
  MessageCircle,
  Menu,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import HeroBanner from "../public/heroImage_v1.png";
import BrandLogo_text from "../public/brandLogo_Text.png";
import BrandLogo_figure from "../public/brandLogo_figure.png";

import CartSheet, { CartButton } from "../components/shop/CartSheet";
import ProductCarousel from "../components/shop/ProductCarousel";
import SectionHeader from "../components/shop/SectionHeader";
import CategoryShelf, {
  type CategoryItem,
} from "../components/shop/CategoryShelf";
import Testimonials, {
  type Testimonial,
} from "../components/shop/Testimonials";
import type { StorefrontProduct } from "../components/shop/ProductCard";
import EmptyShelf from "../components/shop/EmptyShelf";
import Reveal from "../components/shop/Reveal";
import HowItWorks from "../components/shop/HowItWorks";
import ProductModal from "../components/ProductModal";

interface StorefrontResponse {
  featured: StorefrontProduct[];
  newest: StorefrontProduct[];
  trending: StorefrontProduct[];
  categories: CategoryItem[];
  testimonials: Testimonial[];
}

const EMPTY: StorefrontResponse = {
  featured: [],
  newest: [],
  trending: [],
  categories: [],
  testimonials: [],
};

export default function Home() {
  const router = useRouter();

  const [data, setData] = useState<StorefrontResponse>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [navSearch, setNavSearch] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState<StorefrontProduct | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/storefront");
        const body = await res.json();
        if (!cancelled && body?.success) setData(body.data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = navSearch.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  }

  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

  return (
    <main className="bg-slate-50 text-slate-900">
      {/* ────────────────────────── Navbar ────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 sm:pt-4 lg:px-8">
          <div className="glass relative flex items-center justify-between rounded-2xl border border-white/60 px-4 py-2.5 shadow-lift sm:px-6 sm:py-3">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-1 text-xl font-black tracking-tight sm:text-2xl"
            >
              <Image
                src={BrandLogo_figure}
                alt="ShilpSmith"
                width={36}
                priority
              />
              <Image
                src={BrandLogo_text}
                alt="ShilpSmith"
                width={110}
                height={18}
                priority
              />
            </Link>

            <nav className="hidden items-center gap-7 text-sm font-medium text-slate-700 lg:flex">
              <Link
                href="/search"
                className="transition hover:text-brand-700"
              >
                Shop
              </Link>
              <a
                href="#featured"
                className="transition hover:text-brand-700"
              >
                Featured
              </a>
              <a
                href="#new"
                className="transition hover:text-brand-700"
              >
                New Arrivals
              </a>
              <a
                href="#custom"
                className="transition hover:text-brand-700"
              >
                Custom Orders
              </a>
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <form
                onSubmit={submitSearch}
                className="relative hidden md:flex"
                role="search"
              >
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={navSearch}
                  onChange={(e) => setNavSearch(e.target.value)}
                  placeholder="Search products"
                  className="w-48 rounded-xl border border-slate-200 bg-white/70 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 transition focus:border-brand-500 focus:bg-white focus:outline-none lg:w-56"
                />
              </form>

              <CartButton />

              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden items-center gap-2 whitespace-nowrap rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-cta transition hover:bg-brand-700 sm:inline-flex"
                >
                  <MessageCircle className="h-4 w-4" />
                  Order Now
                </a>
              )}

              <button
                onClick={() => setMobileMenu(!mobileMenu)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 lg:hidden"
                aria-label="Toggle menu"
              >
                {mobileMenu ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>

            {mobileMenu && (
              <div className="absolute inset-x-0 top-full mt-2 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl lg:hidden">
                <form
                  onSubmit={submitSearch}
                  className="relative mb-3 flex md:hidden"
                  role="search"
                >
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={navSearch}
                    onChange={(e) => setNavSearch(e.target.value)}
                    placeholder="Search products"
                    className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </form>
                <nav className="flex flex-col gap-1 text-sm font-medium">
                  {[
                    { href: "/search", label: "Shop" },
                    { href: "#featured", label: "Featured" },
                    { href: "#new", label: "New Arrivals" },
                    { href: "#custom", label: "Custom Orders" },
                  ].map((item) =>
                    item.href.startsWith("#") ? (
                      <a
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenu(false)}
                        className="rounded-xl px-3 py-2.5 text-slate-700 transition hover:bg-slate-100"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenu(false)}
                        className="rounded-xl px-3 py-2.5 text-slate-700 transition hover:bg-slate-100"
                      >
                        {item.label}
                      </Link>
                    )
                  )}
                </nav>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ────────────────────────── Hero ────────────────────────── */}
      <section className="relative overflow-hidden pt-28 pb-12 sm:pt-32 lg:pt-36 lg:pb-24">
        {/* Build-plate dot grid backdrop — replaces the candy gradient orbs */}
        <div
          aria-hidden="true"
          className="bg-build-grid-light pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
        />
        {/* Single subtle accent orb (kept, but smaller + softer) */}
        <div
          aria-hidden="true"
          className="bg-orb pointer-events-none absolute -right-32 top-24 h-[460px] w-[460px] opacity-30"
        />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-600/15 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Crafted on demand · Made in India
            </span>

            <h1
              className="mt-6 font-black leading-[1.05] tracking-tight text-slate-900"
              style={{ fontSize: "clamp(2.25rem, 5vw + 1rem, 4rem)" }}
            >
              Bring your ideas to life with{" "}
              <span className="text-brand-gradient">premium 3D prints</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              Personalized gifts, aesthetic decor, functional accessories,
              educational models, and one-of-a-kind custom creations.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/search"
                className="group inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Shop the catalog
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href={`https://wa.me/${whatsapp}?text=Hi%20I%20want%20a%20custom%203D%20printed%20product`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:border-brand-500 hover:text-slate-900"
              >
                <MessageCircle className="h-4 w-4" />
                Get a custom quote
              </a>
            </div>

            <div className="mt-12 grid w-full grid-cols-3 gap-3 sm:gap-4">
              {[
                { value: "100%", label: "Customizable" },
                { value: "24h", label: "Fast turnaround" },
                { value: "Premium", label: "Print quality" },
              ].map((stat, idx) => (
                <Reveal key={stat.label} delay={150 + idx * 80}>
                  <div className="min-w-0 rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lift">
                    <p className="font-spec text-xl font-bold leading-none tracking-tight text-slate-900 sm:text-2xl">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                      {stat.label}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>

          <Reveal variant="scale" delay={120}>
            <div className="relative">
              <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-brand-500/20 via-cyan-500/15 to-accent-500/20 blur-3xl" />
              <Image
                src={HeroBanner}
                alt="3D printed product collection"
                className="relative rounded-4xl border border-white shadow-2xl"
                priority
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────────────────── How it works ─────────────────────── */}
      <HowItWorks />

      {/* ────────────────────────── Featured ────────────────────────── */}
      <Section id="featured" className="bg-white">
        <Reveal>
        <SectionHeader
          eyebrow="Editor's pick"
          title="Featured products"
          subtitle="Hand-picked best sellers and recent staff favorites."
          href={data.featured.length > 0 ? "/search?sort=featured" : undefined}
        />
        {loading ? (
          <CarouselSkeleton />
        ) : data.featured.length > 0 ? (
          <ProductCarousel
            products={data.featured}
            onSelect={setSelectedProduct}
          />
        ) : (
          <EmptyShelf
            icon="✨"
            title="The first picks are still in the studio"
            subtitle="Our team is curating standout creations. Land here as the catalog goes live — or commission one yourself in the meantime."
            cta={
              whatsapp
                ? {
                    label: "Start a custom order",
                    href: `https://wa.me/${whatsapp}?text=Hi%20I%20want%20a%20custom%203D%20printed%20product`,
                    external: true,
                  }
                : undefined
            }
          />
        )}
        </Reveal>
      </Section>

      {/* ────────────────────────── New arrivals ────────────────────────── */}
      <Section id="new">
        <Reveal>
        <SectionHeader
          eyebrow="Just landed"
          title="New arrivals"
          subtitle="Freshly designed and printed. Swipe to explore the latest drops."
          href={data.newest.length > 0 ? "/search?sort=newest" : undefined}
        />
        {loading ? (
          <CarouselSkeleton />
        ) : data.newest.length > 0 ? (
          <ProductCarousel
            products={data.newest}
            onSelect={setSelectedProduct}
          />
        ) : (
          <EmptyShelf
            icon="🖨️"
            title="Fresh prints rolling off the press"
            subtitle="New drops land here the moment they leave the printer. Be the first to know — or share an idea and we'll make it for you."
            cta={
              whatsapp
                ? {
                    label: "Pitch us an idea",
                    href: `https://wa.me/${whatsapp}?text=Hi%20I%20have%20an%20idea%20for%20a%203D%20printed%20product`,
                    external: true,
                  }
                : undefined
            }
          />
        )}
        </Reveal>
      </Section>

      {/* ────────────────────────── Categories ────────────────────────── */}
      <Section id="categories" className="bg-white">
        <Reveal>
        <SectionHeader
          eyebrow="Shop by category"
          title="Browse what fits your vibe"
          subtitle="From keepsakes to functional gear — pick a shelf to explore."
        />
        {loading ? (
          <ShelfSkeleton />
        ) : data.categories.length > 0 ? (
          <CategoryShelf categories={data.categories} />
        ) : (
          <p className="text-sm text-slate-500">
            No categories yet — add some in the admin panel.
          </p>
        )}
        </Reveal>
      </Section>

      {/* ────────────────────────── Trending ────────────────────────── */}
      <Section id="trending" className="bg-layer-lines">
        <Reveal>
        <SectionHeader
          eyebrow="Going viral"
          title="Trending right now"
          subtitle="What customers loved over the last 30 days."
          href={data.trending.length > 0 ? "/search" : undefined}
          ctaLabel="Shop all"
        />
        {loading ? (
          <CarouselSkeleton />
        ) : data.trending.length > 0 ? (
          <ProductCarousel
            products={data.trending}
            onSelect={setSelectedProduct}
          />
        ) : (
          <EmptyShelf
            icon="🚀"
            title="Hits unlock with the first orders"
            subtitle="This shelf surfaces what customers love most. Be one of the first — every order helps shape the trending list."
            cta={{ label: "Browse the catalog", href: "/search" }}
          />
        )}
        </Reveal>
      </Section>

      {/* ────────────────────────── Why us ────────────────────────── */}
      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: "✍️",
                title: "Truly custom",
                copy: "Engrave names, pick colors, tweak measurements. Each print is yours.",
              },
              {
                icon: "⚡",
                title: "24-hour turnaround",
                copy: "Most standard pieces print and ship within a day of confirmation.",
              },
              {
                icon: "🌿",
                title: "Premium materials",
                copy: "Sturdy, food-safe, biodegradable — built to last, kind to the planet.",
              },
              {
                icon: "💬",
                title: "Direct WhatsApp support",
                copy: "Real humans on the other end — design help, order status, after-sale.",
              },
            ].map((v, idx) => (
              <Reveal key={v.title} delay={idx * 80}>
                <div className="group h-full rounded-3xl border border-slate-100 bg-slate-50/60 p-6 transition hover:-translate-y-1 hover:border-brand-200 hover:bg-white hover:shadow-lift">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-slate-100 transition group-hover:ring-brand-200">
                    {v.icon}
                  </div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900">
                    {v.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {v.copy}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────── Testimonials ────────────────────────── */}
      {data.testimonials.length > 0 && (
        <Section id="reviews">
          <Reveal>
            <SectionHeader
              eyebrow="Loved by customers"
              title="What our community is saying"
              subtitle="Verified buyers, real prints, honest reviews."
            />
            <Testimonials reviews={data.testimonials} />
          </Reveal>
        </Section>
      )}

      {/* ────────────────────────── Custom order ────────────────────────── */}
      <section id="custom" className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal variant="scale">
            <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-8 text-white shadow-2xl sm:p-10 lg:p-16">
              {/* Build-plate dot grid + layer-line motif */}
              <div
                aria-hidden="true"
                className="bg-build-grid pointer-events-none absolute inset-0 opacity-60"
              />
              <div
                aria-hidden="true"
                className="bg-layer-lines-dark pointer-events-none absolute inset-0"
              />
              {/* Soft brand glow */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-24 -top-24 h-[360px] w-[360px] rounded-full bg-brand-500/20 blur-3xl"
              />

              <div className="relative grid items-center gap-10 lg:grid-cols-2">
                <div>
                  <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-brand-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    Built-to-order
                  </span>
                  <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                    Have an idea? We&apos;ll print it.
                  </h2>
                  <p className="mt-4 leading-8 text-slate-300">
                    Share a sketch, Pinterest mood-board, image, or rough
                    concept — we turn it into a premium-quality 3D printed
                    product.
                  </p>
                  <ul className="mt-6 space-y-2.5 text-slate-200">
                    {[
                      "Personalized product design",
                      "Preview before printing",
                      "Delivery across India",
                    ].map((line) => (
                      <li key={line} className="flex items-center gap-3">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
                          <svg
                            viewBox="0 0 24 24"
                            width="12"
                            height="12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur">
                  <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    Start your custom order
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Free design consultation. No deposit required.
                  </p>
                  <a
                    href={`https://wa.me/${whatsapp}?text=Hi%20I%20want%20to%20create%20a%20custom%203D%20printed%20product`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-4 font-semibold shadow-cta transition hover:-translate-y-0.5 hover:bg-brand-700"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Chat on WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ────────────────────────── Footer ────────────────────────── */}
      <section className="bg-slate-900 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to create something unique?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Browse inspiration, customize your design, and place your order
            directly through WhatsApp.
          </p>
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-block rounded-2xl bg-white px-8 py-4 font-semibold text-slate-900 shadow-lg"
          >
            Order via WhatsApp
          </a>
        </div>
      </section>

      <footer className="bg-slate-950 py-8 text-center text-sm text-slate-400">
        © 2026 ShilpSmith 3D Studio. Crafted with precision in India.
      </footer>

      <CartSheet />
      <Toaster />
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </main>
  );
}

// ────────────────────────── helpers ──────────────────────────

function Section({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`py-16 lg:py-24 ${className}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

function CarouselSkeleton() {
  return (
    <div className="-mx-4 flex gap-4 overflow-hidden px-4 pb-2 sm:gap-5 lg:gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="w-[180px] flex-none animate-pulse sm:w-[200px] lg:w-[220px]"
        >
          <div className="aspect-[4/5] rounded-2xl bg-slate-200" />
          <div className="mt-3 h-3 w-3/4 rounded bg-slate-200" />
          <div className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

function ShelfSkeleton() {
  return (
    <div className="-mx-4 flex gap-4 overflow-hidden px-4 pb-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-44 w-[160px] flex-none animate-pulse rounded-2xl bg-slate-200 sm:w-[180px] lg:w-[200px]"
        />
      ))}
    </div>
  );
}
