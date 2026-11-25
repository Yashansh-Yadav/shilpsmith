import Link from "next/link";
import type { Metadata } from "next";

import { prisma } from "../../lib/prisma";
import PageShell from "../../components/site/PageShell";
import Reveal from "../../components/shop/Reveal";
import ProductImage from "../../components/shop/ProductImage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  // Bare title on purpose — the root layout's template appends "· ShilpSmith".
  // Hardcoding the brand here rendered as "Smart NFC Idols — ShilpSmith · ShilpSmith".
  title: "Smart NFC Idols",
  description:
    "Tap your phone on a ShilpSmith idol to open a live darshan: aarti, bhajans, scriptures and the day's panchang — in Hindi or English.",
  alternates: { canonical: "/smart-idols" },
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

  const heading = "font-display text-4xl font-semibold tracking-[-0.035em] text-slate-900 sm:text-5xl";
  const eyebrow = "font-mono text-xs font-medium uppercase tracking-[0.18em] text-brand-700";

  return (
    <PageShell>
      {/* Hero — the dark "build chamber" band, with a tap ripple. */}
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <div aria-hidden="true" className="plate-grid absolute inset-0 -z-10" />
        <div aria-hidden="true" className="heated-bed absolute inset-0 -z-10" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[3fr_2fr] lg:py-28">
          <div>
            <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-brand-300">
              Smart NFC Idols
            </p>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Tap. Connect.
              <br />
              <span className="text-brand-200">Begin darshan.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
              Every ShilpSmith Smart idol carries a built-in NFC tag. One tap
              opens a living darshan — aarti, bhajans, scriptures and
              today&apos;s panchang, in Hindi or English.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link
                href="/search"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-7 py-4 font-semibold text-slate-950 transition hover:brightness-110 active:scale-[.97]"
              >
                Shop Smart idols →
              </Link>
              {deities[0] && (
                <Link
                  href={`/darshan/${deities[0].key}`}
                  className="inline-flex items-center gap-2 rounded-full bg-white/10 px-7 py-4 font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15 active:scale-[.97]"
                >
                  Try a live demo →
                </Link>
              )}
            </div>
          </div>

          <div aria-hidden="true" className="relative mx-auto grid h-64 w-64 place-items-center sm:h-80 sm:w-80">
            <span className="ripple absolute h-40 w-40 rounded-full ring-2 ring-brand-400" />
            <span className="ripple ripple-2 absolute h-40 w-40 rounded-full ring-2 ring-brand-400" />
            <span className="ripple ripple-3 absolute h-40 w-40 rounded-full ring-2 ring-brand-400" />
            <span className="relative grid h-28 w-28 place-items-center rounded-full bg-brand-500 font-mono text-xl font-bold text-slate-950">
              NFC
            </span>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <p className={eyebrow}>How it works</p>
        <h2 className={`mt-4 ${heading}`}>From tap to darshan in seconds</h2>
        <ol className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Reveal delay={i * 80} className="h-full rounded-[2rem] bg-white p-8 ring-1 ring-slate-200/70">
                <p className="font-mono text-sm text-brand-700">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 font-display text-2xl font-semibold tracking-tight text-slate-900">
                  {s.title}
                </h3>
                <p className="mt-3 text-lg leading-relaxed text-slate-600">{s.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* Features */}
      <section className="bg-white py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <p className={eyebrow}>Everything inside</p>
          <h2 className={`mt-4 ${heading}`}>A complete darshan companion</h2>
          <dl className="mt-12 grid grid-cols-1 gap-x-12 gap-y-10 border-t border-slate-200 pt-10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(([, title, body], i) => (
              <Reveal key={title} delay={i * 60}>
                <dt className="font-display text-xl font-semibold tracking-tight text-slate-900">{title}</dt>
                <dd className="mt-2 text-lg leading-relaxed text-slate-600">{body}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* Live demos */}
      {deities.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
          <p className={eyebrow}>Try it now</p>
          <h2 className={`mt-4 ${heading}`}>Experience a live darshan</h2>
          <p className="mt-4 max-w-xl text-lg text-slate-600">
            No idol needed — open any deity&apos;s darshan page right here.
          </p>
          <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deities.map((d) => (
              <Link
                key={d.key}
                href={`/darshan/${d.key}`}
                className="group relative isolate overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white transition hover:-translate-y-1"
              >
                <div aria-hidden="true" className="heated-bed absolute inset-0 -z-10 opacity-60" />
                <p className="font-display text-3xl font-semibold tracking-tight">{d.nameHi}</p>
                <p className="mt-1 text-slate-400">{d.nameEn}</p>
                <p className="mt-6 font-mono text-sm text-brand-300">{d.mantra}</p>
                <p className="mt-6 text-sm font-semibold text-white/80 group-hover:text-white">
                  Open darshan →
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Idol products */}
      {products.length > 0 && (
        <section className="bg-white py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className={eyebrow}>Shop</p>
                <h2 className={`mt-4 ${heading}`}>Smart NFC idols</h2>
              </div>
              <Link
                href="/search"
                className="rounded-full bg-white px-6 py-3.5 font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:ring-slate-400"
              >
                See all →
              </Link>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p) => (
                <Link
                  key={p.id}
                  href={p.deity ? `/darshan/${p.deity.key}` : "/search"}
                  className="group block"
                >
                  <div className="overflow-hidden rounded-[1.75rem] bg-slate-200">
                    <ProductImage
                      src={p.images[0]?.url}
                      alt={p.name}
                      productId={p.id}
                      aspectClass="aspect-[2/3]"
                      className="transition duration-700 group-hover:scale-[1.04]"
                    />
                  </div>
                  <p className="mt-4 px-1 font-display text-lg font-semibold leading-tight tracking-tight text-slate-900">
                    {p.name}
                  </p>
                  <p className="mt-1 px-1 text-sm font-semibold text-brand-700">View darshan →</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative isolate overflow-hidden bg-slate-950 py-24 text-center text-white">
        <div aria-hidden="true" className="heated-bed absolute inset-0 -z-10" />
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="font-display text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-6xl">
            Bring the divine closer
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-300">
            A meaningful, modern gift for every devotee — crafted on demand.
          </p>
          <Link
            href="/search"
            className="mt-9 inline-flex rounded-full bg-white px-8 py-4 font-semibold text-slate-950 transition hover:bg-brand-100 active:scale-[.97]"
          >
            Explore Smart idols
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
