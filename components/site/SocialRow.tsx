"use client";

import { useEffect, useState } from "react";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";

import type { SocialLink } from "../../lib/social";

// Client-side rather than server-rendered because SiteFooter is also mounted by
// the homepage, which is a client component and therefore can't render an async
// server child. The SEO-critical copy of these URLs is the `sameAs` array in the
// root layout's Organization JSON-LD, which IS server-rendered.
interface Props {
  /** Skip the fetch when a server parent already has the links. */
  links?: SocialLink[];
  className?: string;
}

// lucide dropped most brand marks; rather than hand-draw inaccurate logos, the
// platforms without an official glyph fall back to their initial in the same
// circular chip, so the row still reads as one set.
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  facebook: Facebook,
  youtube: Youtube,
  linkedin: Linkedin,
  x: XMark,
};

function XMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  );
}

export default function SocialRow({ links, className = "" }: Props) {
  const [resolved, setResolved] = useState<SocialLink[]>(links ?? []);

  useEffect(() => {
    if (links) return;
    let cancelled = false;
    fetch("/api/settings/social")
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled && body?.success && Array.isArray(body.data)) {
          setResolved(body.data as SocialLink[]);
        }
      })
      .catch(() => {
        /* swallow — the footer is fine without social links */
      });
    return () => {
      cancelled = true;
    };
  }, [links]);

  if (resolved.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {resolved.map((link) => {
        const Icon = ICONS[link.key];
        return (
          <a
            key={link.key}
            href={link.url}
            target="_blank"
            rel="me noreferrer"
            aria-label={link.label}
            title={link.label}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 text-slate-300 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
          >
            {Icon ? (
              <Icon className="h-4 w-4" />
            ) : (
              <span className="text-xs font-bold uppercase">
                {link.label.charAt(0)}
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
}
