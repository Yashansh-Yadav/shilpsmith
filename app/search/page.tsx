"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Toaster } from "react-hot-toast";

import { ArrowLeft, Search as SearchIcon } from "lucide-react";

import CartSheet, { CartButton } from "../../components/shop/CartSheet";
import ProductImage from "../../components/shop/ProductImage";

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
  customizable: boolean;
  featured: boolean;
  images: ProductImage[];
  category: { slug: string; name: string };
}

function formatRupee(s: string) {
  const n = Number(String(s).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n === 0) return s;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function SearchInner() {
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

  const [categories, setCategories] = useState<Category[]>([]);
  const [results, setResults] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then(async (r) => {
        if (!r.ok) return [];
        const body = await r.json();
        return Array.isArray(body?.data) ? body.data : [];
      })
      .catch(() => [])
      .then((cs) => setCategories(cs));
  }, []);

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

  return (
    <main className="min-h-screen bg-slate-50 py-8">
      <Toaster />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Browse products
            </h1>
          </div>
          <CartButton />
        </header>

        <div className="relative mb-8">
          <SearchIcon className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, description…"
            className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-14 pr-5 text-base shadow-sm transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-4">
            <FilterCard title="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FilterCard>

            <FilterCard title="Price (₹)">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Min"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Max"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </FilterCard>

            <FilterCard title="Customizable">
              <select
                value={customizable}
                onChange={(e) => setCustomizable(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Any</option>
                <option value="true">Customizable only</option>
                <option value="false">Standard only</option>
              </select>
            </FilterCard>

            <FilterCard title="Sort">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="featured">Featured first</option>
                <option value="priceAsc">Price (low → high)</option>
                <option value="priceDesc">Price (high → low)</option>
              </select>
            </FilterCard>

            <button
              type="button"
              onClick={clearAll}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Clear filters
            </button>
          </aside>

          <section>
            <p className="mb-4 text-sm text-slate-500">
              {loading
                ? "Searching…"
                : `${results.length} product${results.length === 1 ? "" : "s"}`}
            </p>

            {results.length === 0 && !loading ? (
              <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
                <p className="text-slate-500">No products match these filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {results.map((p) => (
                  <Link
                    key={p.id}
                    href={`/?productId=${p.id}`}
                    className="block overflow-hidden rounded-2xl border border-slate-100 bg-white transition hover:shadow-2xl"
                  >
                    <ProductImage
                      src={p.images?.[0]?.url}
                      alt={p.name}
                      productId={p.id}
                      aspectClass="h-40 w-full sm:h-52 lg:h-64"
                    />
                    <div className="p-3 lg:p-4">
                      <h3 className="line-clamp-1 text-sm font-bold lg:text-base">
                        {p.name}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500 lg:text-sm">
                        {p.shortDescription || p.description}
                      </p>
                      <p className="mt-2 text-sm font-bold lg:text-base">
                        {formatRupee(p.price)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <CartSheet />
    </main>
  );
}

function FilterCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </p>
      {children}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-sm text-slate-500">Loading…</p>
          </div>
        </main>
      }
    >
      <SearchInner />
    </Suspense>
  );
}
