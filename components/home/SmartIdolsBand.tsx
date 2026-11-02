import Image from "next/image";
import Link from "next/link";

import { cardDisplay } from "../../lib/discounts";
import type { StorefrontCard } from "../../lib/storefront";
import Reveal from "../shop/Reveal";
import { formatRupee } from "./HomeProductCard";

const FEATURES = [
  ["Chalisa & scriptures", "Read sacred texts anywhere"],
  ["Aarti & bhajans", "Listen in one tap"],
  ["Live Panchang", "Tithi, Nakshatra, Muhurat"],
  ["Festivals & special days", "Never miss a Tuesday"],
];

// Smart NFC idols get their own dark band — they're the studio's most
// distinctive product. Idol images come from the catalogue (any product with
// "NFC" in its name); without any, the band still links to /smart-idols.
export default function SmartIdolsBand({ products }: { products: StorefrontCard[] }) {
  const idols = products.filter((p) => /nfc/i.test(p.name) && p.images?.[0]?.url).slice(0, 2);
  const prices = idols.map((p) => cardDisplay(p));
  const from = prices.length ? prices.reduce((a, b) => (b.price < a.price ? b : a)) : null;

  return (
    <section id="idols" className="relative isolate overflow-hidden bg-slate-950 py-24 text-white lg:py-32">
      <div aria-hidden="true" className="heated-bed absolute inset-0 -z-10 opacity-70" />
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-2">
        <Reveal>
          <p className="font-mono text-sm text-brand-300">Smart NFC idols</p>
          <h2 className="mt-4 font-display text-5xl font-semibold leading-[0.95] tracking-[-0.035em] sm:text-6xl">
            Tap the chakra.
            <br />
            Open darshan.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-300">
            Every ShilpSmith Smart idol carries a built-in NFC tag. One tap opens
            its darshan page — no app, no scanning.
          </p>
          <ul className="mt-10 grid max-w-lg grid-cols-2 gap-x-6 gap-y-5">
            {FEATURES.map(([title, sub]) => (
              <li key={title}>
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-sm text-slate-400">{sub}</p>
              </li>
            ))}
          </ul>
          <div className="mt-12 flex flex-wrap items-center gap-6">
            <Link
              href="/smart-idols"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-4 font-semibold text-slate-950 transition hover:bg-brand-400 active:scale-[.97]"
            >
              Explore Smart Idols
            </Link>
            {from && (
              <p className="text-slate-300">
                From <span className="font-mono text-xl font-bold text-white">{formatRupee(from.price)}</span>{" "}
                {from.listPrice != null && (
                  <span className="font-mono text-sm text-slate-500 line-through">
                    {formatRupee(from.listPrice)}
                  </span>
                )}
              </p>
            )}
          </div>
        </Reveal>

        {idols.length > 0 && (
          <Reveal delay={150}>
            <div className="relative mx-auto h-[440px] w-full max-w-[520px] sm:h-[540px]">
              {idols.map((p, k) => (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  className={`absolute w-[58%] transition duration-500 hover:z-10 hover:rotate-0 hover:scale-[1.03] ${
                    k === 0 ? "right-0 top-0 rotate-3" : "left-0 top-10 -rotate-6"
                  }`}
                >
                  {/* Posters are 2:3; width/height only reserve that ratio. */}
                  <Image
                    src={p.images![0].url}
                    alt={p.name}
                    width={1024}
                    height={1536}
                    sizes="(max-width: 640px) 58vw, 300px"
                    className="h-auto w-full rounded-3xl ring-1 ring-white/10"
                  />
                </Link>
              ))}
              <div aria-hidden="true" className="pointer-events-none absolute bottom-4 left-1/2 z-20 grid h-28 w-28 -translate-x-1/2 place-items-center">
                <span className="ripple absolute h-full w-full rounded-full ring-2 ring-brand-400" />
                <span className="ripple ripple-2 absolute h-full w-full rounded-full ring-2 ring-brand-400" />
                <span className="ripple ripple-3 absolute h-full w-full rounded-full ring-2 ring-brand-400" />
                <span className="relative grid h-16 w-16 place-items-center rounded-full bg-brand-500 font-mono text-sm font-bold text-slate-950">
                  NFC
                </span>
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
