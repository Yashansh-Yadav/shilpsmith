import Link from "next/link";

import type { StorefrontData } from "../../lib/storefront";
import Reveal from "../shop/Reveal";

// Categories as big typographic rows; an emerald "extrusion" fills each row on
// hover (CSS .cat-fill). Shelves with products come first; empty ones stay
// listed (and linkable) but say "Coming soon" instead of a count.
export default function CategoryRows({ categories }: { categories: StorefrontData["categories"] }) {
  if (categories.length === 0) return null;
  const sorted = [...categories].sort(
    (a, b) => Number(b.productCount > 0) - Number(a.productCount > 0)
  );

  return (
    <section id="categories" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <h2 className="font-display text-5xl font-semibold tracking-[-0.035em] text-slate-900 sm:text-6xl">
            Browse what fits your vibe
          </h2>
        </Reveal>
        <ul className="mt-12 divide-y divide-slate-200 border-y border-slate-200">
          {sorted.map((c, k) => (
            <li key={c.id}>
              <Reveal delay={k * 60}>
                <Link
                  href={`/categories/${c.slug}`}
                  className="group relative isolate flex items-center justify-between gap-6 overflow-hidden px-2 py-7 outline-none sm:px-4"
                >
                  <span aria-hidden="true" className="cat-fill absolute inset-0 -z-10 bg-brand-500" />
                  <span className="font-display text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-5xl">
                    {c.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-5">
                    <span className="hidden font-mono text-sm text-slate-500 group-hover:text-slate-950 sm:inline">
                      {c.productCount > 0
                        ? `${c.productCount} product${c.productCount > 1 ? "s" : ""}`
                        : "Coming soon"}
                    </span>
                    <span
                      aria-hidden="true"
                      className="grid h-12 w-12 place-items-center rounded-full bg-white text-xl ring-1 ring-slate-200 transition group-hover:-rotate-45"
                    >
                      →
                    </span>
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
