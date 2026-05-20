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
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-brand-700">
            <span className="h-px w-6 bg-brand-600" />
            {eyebrow}
          </p>
        )}
        <h2
          className="font-black tracking-tight text-slate-900"
          style={{ fontSize: "clamp(1.75rem, 2.5vw + 0.75rem, 2.75rem)" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-500">
            {subtitle}
          </p>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:border-brand-500 hover:text-brand-700 hover:shadow-sm"
        >
          {ctaLabel}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
