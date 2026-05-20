"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Flame,
  Gem,
  Gift,
  Home,
  ShoppingBag,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface CategoryItem {
  id: number;
  slug: string;
  name: string;
  image?: string | null;
}

// Slug → icon map. Falls back to ShoppingBag for slugs we haven't styled yet,
// so new categories created in /admin show up cleanly without code changes.
const ICON_BY_SLUG: Record<string, LucideIcon> = {
  "personalized-gifts": Gift,
  "home-decor": Home,
  "educational-student": BookOpen,
  "functional-products": Wrench,
  "jewelry-fashion": Gem,
  "spiritual-artistic": Flame,
};

function iconFor(slug: string): LucideIcon {
  return ICON_BY_SLUG[slug] ?? ShoppingBag;
}

interface Props {
  categories: CategoryItem[];
}

// Adaptive layout:
//   - any count → horizontal scroll-snap row with `flex-none` tiles
//   - works for 3 OR 30 categories without re-layout
//   - trailing "Browse all" tile so the end of the row always has a CTA
//
// Visual: clean white tiles with a brand-tinted lucide icon block, hairline
// border, subtle hover lift. No rainbow gradients, no emoji.
export default function CategoryShelf({ categories }: Props) {
  if (categories.length === 0) return null;

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4">
      {categories.map((c) => {
        const Icon = iconFor(c.slug);
        return (
          <Link
            key={c.id}
            href={`/categories/${c.slug}`}
            className="group flex-none snap-start w-[170px] sm:w-[190px] lg:w-[210px]"
          >
            <article className="relative flex h-full flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 transition duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-lift">
              {/* Top-right arrow that brightens on hover */}
              <ArrowUpRight
                className="absolute right-4 top-4 h-4 w-4 text-slate-300 transition group-hover:text-brand-600"
                strokeWidth={2.5}
              />

              {/* Icon block — brand-tinted square */}
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-600/10 transition group-hover:bg-brand-100 group-hover:text-brand-800">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </div>

              <div>
                <p className="text-sm font-semibold leading-snug text-slate-900">
                  {c.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">Shop the shelf</p>
              </div>
            </article>
          </Link>
        );
      })}

      {/* Trailing "Browse all" tile — dashed border so it visually trails */}
      <Link
        href="/search"
        className="group flex-none snap-start w-[170px] sm:w-[190px] lg:w-[210px]"
      >
        <article className="flex h-full flex-col gap-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-5 transition duration-300 hover:-translate-y-1 hover:border-slate-400 hover:bg-white">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-500 ring-1 ring-slate-200 transition group-hover:text-slate-900">
            <Sparkles className="h-5 w-5" strokeWidth={1.8} />
          </div>

          <div>
            <p className="text-sm font-semibold leading-snug text-slate-900">
              Browse all
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Every category, one page
            </p>
          </div>
        </article>
      </Link>
    </div>
  );
}
