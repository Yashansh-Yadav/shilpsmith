import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "../../lib/prisma";
import { SITE_NAME } from "../../lib/site";
import SectionHeader from "../../components/shop/SectionHeader";
import Reveal from "../../components/shop/Reveal";
import ProductImage from "../../components/shop/ProductImage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Smart NFC Idols — ${SITE_NAME}`,
  description:
    "Tap your phone on a ShilpSmith idol to open a live darshan: aarti, bhajans, scriptures and the day's panchang — in Hindi or English.",
};

const STEPS = [
  {
    emoji: "📲",
    title: "Tap your phone",
    body: "Every Smart idol has a built-in NFC tag. A single tap opens its darshan page — no app, no scanning.",
  },
  {
    emoji: "🕉️",
    title: "Begin darshan",
    body: "The right aarti for the time of day, bhajans, and scriptures — all in one place.",
  },
  {
    emoji: "📅",
    title: "Today's panchang",
    body: "Tithi, paksha, nakshatra, sunrise & sunset, plus the deity's special days — read aloud in Hindi if you like.",
  },
];

const FEATURES = [
  ["🌅", "Time-aware aarti", "Morning aarti in the morning, sandhya aarti after sunset — automatically."],
  ["📖", "Scriptures", "Read the deity's scriptures right on your phone."],
  ["🎵", "Bhajans", "A curated playlist for every deity."],
  ["🗓️", "Special days", "Somvar, Pradosh, Navratri and more — highlighted on the day."],
  ["🔊", "Hear it aloud", "The day's panchang spoken in Hindi or English."],
  ["🇮🇳", "Hindi-first", "Built for Hindi, with an English toggle."],
];

export default async function SmartIdolsPage() {
  // The genuinely working showcase: active deities you can demo right now.
  const deities = await prisma.deity.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    select: { key: true, nameEn: true, nameHi: true, mantra: true },
  });

  // Idol products linked to a deity.
  const products = await prisma.product.findMany({
    where: { deletedAt: null, deity: { is: { active: true } } },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      name: true,
      slug: true,
      images: { orderBy: { id: "asc" }, take: 1, select: { url: true } },
      deity: { select: { key: true } },
    },
  });

  return (
    <main className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-800 to-brand-600 text-white">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] backdrop-blur">
            ✨ Smart NFC Idols
          </p>
          <h1 className="text-4xl font-black leading-tight sm:text-6xl">
            Tap. Connect. <span className="text-brand-200">Begin darshan.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/90">
            Every ShilpSmith Smart idol carries a built-in NFC tag. One tap opens
            a living darshan — aarti, bhajans, scriptures and today&apos;s
            panchang, in Hindi or English.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/search"
              className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-cta transition hover:bg-brand-50"
            >
              Shop Smart idols
            </Link>
            {deities[0] && (
              <Link
                href={`/darshan/${deities[0].key}`}
                className="rounded-full border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold backdrop-blur transition hover:bg-white/20"
              >
                Try a live demo →
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <SectionHeader eyebrow="How it works" title="From tap to darshan in seconds" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 80}>
              <div className="h-full rounded-4xl bg-slate-50 p-6">
                <div className="mb-3 text-4xl">{s.emoji}</div>
                <h3 className="mb-2 text-lg font-bold">{s.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <SectionHeader
            eyebrow="Everything inside"
            title="A complete darshan companion"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([emoji, title, body], i) => (
              <Reveal key={title} delay={i * 60}>
                <div className="flex h-full gap-3 rounded-3xl bg-white p-5 shadow-sm">
                  <div className="text-2xl">{emoji}</div>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="text-sm text-slate-500">{body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Live demos */}
      {deities.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <SectionHeader
            eyebrow="Try it now"
            title="Experience a live darshan"
            subtitle="No idol needed — open any deity's darshan page right here."
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {deities.map((d) => (
              <Link
                key={d.key}
                href={`/darshan/${d.key}`}
                className="rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-sm transition hover:shadow-lift"
              >
                <div className="text-lg font-bold">{d.nameHi}</div>
                <div className="text-sm text-slate-500">{d.nameEn}</div>
                <div className="mt-2 text-xs text-brand-600">{d.mantra}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Idol products */}
      {products.length > 0 && (
        <section className="bg-slate-50">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <SectionHeader
              eyebrow="Shop"
              title="Smart NFC idols"
              href="/search"
              ctaLabel="See all"
            />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {products.map((p) => (
                <Link
                  key={p.id}
                  href={p.deity ? `/darshan/${p.deity.key}` : "/search"}
                  className="group overflow-hidden rounded-3xl bg-white shadow-sm transition hover:shadow-lift"
                >
                  <ProductImage
                    src={p.images[0]?.url}
                    alt={p.name}
                    productId={p.id}
                    aspectClass="aspect-square"
                  />
                  <div className="p-3">
                    <div className="line-clamp-1 text-sm font-medium">
                      {p.name}
                    </div>
                    <div className="text-xs text-brand-600">View darshan →</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-3xl font-black sm:text-4xl">
          Bring the divine closer
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-500">
          A meaningful, modern gift for every devotee — crafted on demand.
        </p>
        <Link
          href="/search"
          className="mt-6 inline-block rounded-full bg-brand-600 px-8 py-3 text-sm font-semibold text-white shadow-cta transition hover:bg-brand-700"
        >
          Explore Smart idols
        </Link>
      </section>
    </main>
  );
}
