"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Search, X } from "lucide-react";

import BrandLogoFigure from "../../public/brandLogo_figure.png";
import { CartButton } from "../shop/CartSheet";

const NAV = [
  { href: "/search", label: "Shop" },
  { href: "/smart-idols", label: "Smart Idols" },
  { href: "/#custom", label: "Custom Orders" },
  { href: "/about", label: "About" },
  { href: "/track", label: "Track Order" },
];

// The one storefront header.
//   variant="overlay" — homepage: fixed, transparent over the dark hero, dark
//                       once anything scrolls under it, white past the hero.
//   variant="solid"   — every other page: sticky white bar.
// Both carry search (expanding panel) and the cart button, so no page needs
// to mount its own CartButton.
export default function SiteHeader({ variant = "solid" }: { variant?: "overlay" | "solid" }) {
  const router = useRouter();
  const pathname = usePathname();
  const overlay = variant === "overlay";
  const [mode, setMode] = useState<"top" | "hero" | "page">(overlay ? "top" : "page");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => {
      const y = window.scrollY;
      // The hero is taller than the viewport on phones — switch at its real end.
      const heroEnd = (document.getElementById("hero")?.offsetHeight ?? window.innerHeight) - 72;
      setMode(y > heroEnd ? "page" : y > 24 ? "hero" : "top");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  // Close panels on navigation.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen && !searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, searchOpen]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = q.trim();
    setSearchOpen(false);
    router.push(t ? `/search?q=${encodeURIComponent(t)}` : "/search");
  }

  const isActive = (href: string) => !href.includes("#") && pathname?.startsWith(href);

  const light = mode === "page";
  const panel = menuOpen || searchOpen;
  const bar = light
    ? "bg-white shadow-[0_1px_0_rgba(15,23,42,.08)]"
    : mode === "hero" || panel
      ? "bg-slate-950"
      : "bg-transparent";
  const fg = light ? "text-slate-900" : "text-white";
  const iconBtn = `grid h-11 w-11 place-items-center rounded-full transition active:scale-95 ${
    light ? "text-slate-900 hover:bg-slate-100" : "text-white hover:bg-white/10"
  }`;

  return (
    <header
      className={`${overlay ? "fixed" : "sticky"} inset-x-0 top-0 z-50 transition-colors duration-300 ${bar}`}
    >
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="ShilpSmith home">
          <Image src={BrandLogoFigure} alt="" width={36} height={36} priority className="rounded-lg" />
          <span className={`font-display text-[1.35rem] font-bold tracking-tight ${fg}`}>ShilpSmith</span>
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-8 text-[15px] font-medium">
            {NAV.map((item) => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`transition hover:text-brand-500 ${
                      active
                        ? light
                          ? "text-brand-700"
                          : "text-brand-300"
                        : light
                          ? "text-slate-600"
                          : "text-slate-300"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            aria-label={searchOpen ? "Close search" : "Search products"}
            aria-expanded={searchOpen}
            onClick={() => {
              setSearchOpen((v) => !v);
              setMenuOpen(false);
            }}
            className={iconBtn}
          >
            {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </button>
          <CartButton className={iconBtn} />
          <Link
            href="/search"
            className="ml-1 hidden rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-brand-400 sm:inline-flex"
          >
            Order Now
          </Link>
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((v) => !v);
              setSearchOpen(false);
            }}
            className={`${iconBtn} lg:hidden`}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <form onSubmit={submit} role="search" className={`pb-6 ${light ? "bg-white" : "bg-slate-950"}`}>
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 sm:px-8">
            <label htmlFor="site-search" className="sr-only">
              Search products
            </label>
            <input
              id="site-search"
              type="search"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search nameplates, idols, gifts…"
              className={`w-full rounded-full px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                light
                  ? "bg-slate-100 text-slate-900 placeholder:text-slate-400"
                  : "bg-white/10 text-white placeholder:text-slate-400"
              }`}
            />
            <button
              type="submit"
              className="rounded-full bg-brand-500 px-6 py-4 font-semibold text-slate-950 transition hover:bg-brand-400"
            >
              Search
            </button>
          </div>
        </form>
      )}

      {menuOpen && (
        <nav aria-label="Mobile" className={`pb-6 lg:hidden ${light ? "bg-white" : "bg-slate-950"}`}>
          <ul className="mx-auto flex max-w-7xl flex-col px-5 sm:px-8">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block py-3 font-display text-2xl font-semibold ${fg}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
