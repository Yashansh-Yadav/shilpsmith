"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Props {
  icon: string;
  title: string;
  subtitle?: string;
  cta?: { label: string; href: string; external?: boolean };
}

// Section-level empty state. Wider and more expressive than the per-card
// "dropping soon" placeholder — used when an entire shelf (featured /
// newest / trending) has no products to show.
export default function EmptyShelf({ icon, title, subtitle, cta }: Props) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-50 via-white to-cyan-50 px-6 py-12 text-center shadow-sm ring-1 ring-brand-600/10 sm:py-16">
      {/* Decorative layer rings (3D-print echo) */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full text-brand-600/10"
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <circle cx="200" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="0.8" />
        <circle cx="200" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="0.8" />
        <circle cx="200" cy="100" r="50" fill="none" stroke="currentColor" strokeWidth="0.8" />
        <circle cx="200" cy="100" r="30" fill="none" stroke="currentColor" strokeWidth="0.8" />
      </svg>

      <div className="relative mx-auto max-w-md">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-700 ring-1 ring-brand-600/20 backdrop-blur sm:text-xs">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-600 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" />
          </span>
          Coming up
        </div>

        <div className="text-5xl sm:text-6xl">{icon}</div>

        <h3 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
            {subtitle}
          </p>
        )}

        {cta && (
          <div className="mt-6">
            {cta.external ? (
              <a
                href={cta.href}
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-1.5 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                {cta.label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            ) : (
              <Link
                href={cta.href}
                className="group inline-flex items-center gap-1.5 rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                {cta.label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
