"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";

import ProductCard from "../shop/ProductCard";

interface Category {
  id: number;
  slug: string;
  name: string;
}

interface ProductImage {
  url: string;
}

interface ProductRow {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  price: string;
  discountPrice?: string | null;
  eventDiscountPercent?: number | null;
  customizable: boolean;
  featured: boolean;
  stock?: number;
  stockStatus?: string;
  images: ProductImage[];
  category: { slug: string; name: string };
  rating?: { average: number; count: number } | null;
}

interface Props {
  initialResults: ProductRow[];
  initialCategories: Category[];
}

// Header, footer, cart drawer and toast host come from PageShell
// (app/search/layout.tsx) — this component renders only the page body.
export default function SearchClient({ initialResults, initialCategories }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const initialQ = params.get("q") ?? "";
  const initialCategory = params.get("category") ?? "";
  const initialCustomizable = params.get("customizable") ?? "";
  const initialSort = params.get("sort") ?? "newest";
  const initialMin = params.get("minPrice") ?? "";
  const initialMax = params.get("maxPrice") ?? "";

  const [q, setQ] = useState(initialQ);
  const [category, setCategory] = useState(initialCategory);
  const [customizable, setCustomizable] = useState(initialCustomizable);
  const [sort, setSort] = useState(initialSort);
  const [minPrice, setMinPrice] = useState(initialMin);
  const [maxPrice, setMaxPrice] = useState(initialMax);

  // Seeded from the server render, so the first paint already has results and
  // filters — no empty flash, and the markup crawlers receive is the real page.
  const [categories] = useState<Category[]>(initialCategories);
  const [results, setResults] = useState<ProductRow[]>(initialResults);
  const [loading, setLoading] = useState(false);

  // Price + customisation live in a collapsible panel; open it on load when
  // the URL already carries one of them so the active filter is visible.
  const [filtersOpen, setFiltersOpen] = useState(
    Boolean(initialMin || initialMax || initialCustomizable)
  );

  // The server already ran the query for the URL we mounted on. Without this
  // the debounced effect below would immediately re-run the identical query.
  const seeded = useRef(true);

  const fetchUrl = useMemo(() => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (category) sp.set("category", category);
    if (customizable) sp.set("customizable", customizable);
    if (sort) sp.set("sort", sort);
    if (minPrice) sp.set("minPrice", minPrice);
    if (maxPrice) sp.set("maxPrice", maxPrice);
    return `/api/products?${sp.toString()}`;
  }, [q, category, customizable, sort, minPrice, maxPrice]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(fetchUrl);
      const body = await res.json();
      setResults(body?.success ? body.data : []);
    } finally {
      setLoading(false);
    }
  }, [fetchUrl]);

  // Sync URL bar without reloading the page, so users can share filtered links.
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (category) sp.set("category", category);
    if (customizable) sp.set("customizable", customizable);
    if (sort && sort !== "newest") sp.set("sort", sort);
    if (minPrice) sp.set("minPrice", minPrice);
    if (maxPrice) sp.set("maxPrice", maxPrice);
    const qs = sp.toString();
    router.replace(`/search${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [q, category, customizable, sort, minPrice, maxPrice, router]);

  // Debounce loads so the user typing doesn't fire one query per keystroke.
  useEffect(() => {
    if (seeded.current) {
      seeded.current = false;
      return;
    }
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [load]);

  function clearAll() {
    setQ("");
    setCategory("");
    setCustomizable("");
    setSort("newest");
    setMinPrice("");
    setMaxPrice("");
  }

  // Filters inside the collapsible panel, counted for the toggle's badge.
  const panelFilters = [minPrice, maxPrice, customizable].filter(Boolean).length;
  const anyFilter = Boolean(
    q || category || customizable || minPrice || maxPrice || sort !== "newest"
  );
  const activeCategory = categories.find((c) => c.slug === category);

  const chip = (on: boolean) =>
    `shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
      on
        ? "bg-slate-900 text-white"
        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-400"
    }`;
  const field =
    "w-full rounded-2xl bg-white px-4 py-3 text-[15px] text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500";

  return (
    <>
      {/* Dark band — the same "build chamber" treatment as PageHeader, with
          the search box living inside it. */}
      <div className="relative isolate overflow-hidden bg-slate-950 text-white">
        <div aria-hidden="true" className="plate-grid absolute inset-0 -z-10" />
        <div aria-hidden="true" className="heated-bed absolute inset-0 -z-10" />
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
          <p className="mb-4 font-mono text-xs font-medium uppercase tracking-[0.18em] text-brand-300">
            The shop
          </p>
          <h1 className="break-words font-display text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            {q ? (
              <>
                Results for <span className="text-brand-200">“{q}”</span>
              </>
            ) : activeCategory ? (
              activeCategory.name
            ) : (
              "Shop all products"
            )}
          </h1>
          <div className="relative mt-8 max-w-2xl">
            <SearchIcon className="pointer-events-none absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <label htmlFor="shop-search" className="sr-only">
              Search products
            </label>
            <input
              id="shop-search"
              type="search"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search nameplates, idols, gifts…"
              className="w-full appearance-none rounded-full bg-white/10 py-4 pl-14 pr-6 text-lg text-white ring-1 ring-white/15 transition placeholder:text-slate-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
        {/* Toolbar: category chips (scroll sideways on phones), filters toggle, sort */}
        <div>
          <div
            className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
            role="group"
            aria-label="Filter by category"
          >
            <button
              type="button"
              aria-pressed={!category}
              onClick={() => setCategory("")}
              className={chip(!category)}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                type="button"
                aria-pressed={category === c.slug}
                onClick={() => setCategory(c.slug)}
                className={chip(category === c.slug)}
              >
                {c.name}
              </button>
            ))}
          </div>

        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-sm text-slate-500" aria-live="polite">
            {loading
              ? "Searching…"
              : `${results.length} product${results.length === 1 ? "" : "s"}`}
          </p>
          <div className="flex items-center gap-2">
            {anyFilter && !filtersOpen && (
              <button
                type="button"
                onClick={clearAll}
                className="hidden items-center gap-1.5 px-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900 sm:inline-flex"
              >
                <X className="h-4 w-4" />
                Clear
              </button>
            )}
            <button
              type="button"
              aria-expanded={filtersOpen}
              aria-controls="shop-filters"
              onClick={() => setFiltersOpen((v) => !v)}
              className={`inline-flex items-center gap-2 ${chip(filtersOpen)}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {panelFilters > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 font-mono text-[11px] font-bold text-slate-950">
                  {panelFilters}
                </span>
              )}
            </button>
            <label htmlFor="shop-sort" className="sr-only">
              Sort by
            </label>
            <select
              id="shop-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="min-w-0 rounded-full bg-white py-2.5 pl-4 pr-9 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="featured">Featured first</option>
              <option value="priceAsc">Price: low → high</option>
              <option value="priceDesc">Price: high → low</option>
            </select>
          </div>
        </div>

        {filtersOpen && (
          <div
            id="shop-filters"
            className="mt-5 grid gap-6 rounded-[1.75rem] bg-white p-6 ring-1 ring-slate-200/70 md:grid-cols-[1fr_1fr_auto] md:items-end"
          >
            <FilterField title="Price (₹)">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  aria-label="Minimum price"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Min"
                  className={field}
                />
                <span className="text-slate-400">–</span>
                <input
                  type="number"
                  inputMode="numeric"
                  aria-label="Maximum price"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Max"
                  className={field}
                />
              </div>
            </FilterField>

            <FilterField title="Customisation">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Customisation">
                {[
                  ["", "Any"],
                  ["true", "Customisable"],
                  ["false", "Standard"],
                ].map(([value, label]) => (
                  <button
                    key={value || "any"}
                    type="button"
                    aria-pressed={customizable === value}
                    onClick={() => setCustomizable(value)}
                    className={chip(customizable === value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </FilterField>

            <button
              type="button"
              onClick={clearAll}
              disabled={!anyFilter}
              className="rounded-full px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:ring-slate-400 disabled:opacity-40"
            >
              Clear all
            </button>
          </div>
        )}

        {results.length === 0 && !loading ? (
          <div className="mt-6 rounded-[1.75rem] bg-white px-6 py-16 text-center ring-1 ring-slate-200/70">
            <p className="font-display text-3xl font-semibold tracking-[-0.03em] text-slate-900">
              Nothing matches yet.
            </p>
            <p className="mx-auto mt-3 max-w-md text-slate-600">
              Try a different search or clear the filters — or ask us to print
              something custom.
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="mt-8 inline-flex rounded-full bg-slate-900 px-7 py-4 font-semibold text-white transition hover:bg-slate-800 active:scale-[.97]"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div
            className={`mt-6 grid grid-cols-2 gap-x-5 gap-y-10 transition-opacity md:grid-cols-3 xl:grid-cols-4 ${
              loading ? "opacity-50" : ""
            }`}
          >
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function FilterField({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      {children}
    </div>
  );
}
