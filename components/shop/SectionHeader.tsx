"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  href?: string;
  ctaLabel?: string;
}

export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  href,
  ctaLabel = "See all",
}: Props) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
      <div>
        {eyebrow && (
          <p className="mb-4 font-mono text-xs font-medium uppercase tracking-[0.18em] text-brand-700">
            {eyebrow}
          </p>
        )}
        <h2 className="font-display text-4xl font-semibold leading-[1] tracking-[-0.035em] text-slate-900 sm:text-5xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600">
            {subtitle}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:ring-slate-400 active:scale-[.97]"
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
