"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, MessageCircle } from "lucide-react";

import BrandLogoText from "../../public/brandLogo_Text.png";
import BrandLogoFigure from "../../public/brandLogo_figure.png";
import { PRIMARY_NAV, WHATSAPP_NUMBER, whatsappLink } from "../../lib/site";

// Lightweight shared header for the marketing / legal / support pages. The
// homepage keeps its own bespoke hero navbar; this gives every other page a
// consistent, navigable top bar.
export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-1">
          <Image src={BrandLogoFigure} alt="ShilpSmith" width={34} priority />
          <Image
            src={BrandLogoText}
            alt="ShilpSmith"
            width={104}
            height={17}
            priority
          />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-700 lg:flex">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="transition hover:text-brand-700"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {WHATSAPP_NUMBER && (
            <a
              href={whatsappLink("Hi! I have a question about ShilpSmith products.")}
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-cta transition hover:bg-brand-700 sm:inline-flex"
            >
              <MessageCircle className="h-4 w-4" />
              Chat with us
            </a>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 lg:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
          <ul className="flex flex-col gap-1 text-sm font-medium">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-slate-700 transition hover:bg-slate-100"
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
