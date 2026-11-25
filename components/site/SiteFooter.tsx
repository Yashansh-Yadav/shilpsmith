import Link from "next/link";

import {
  SITE_LEGAL_NAME,
  SUPPORT_EMAIL,
  BUSINESS_COUNTRY,
  BUSINESS_PHONE,
  BUSINESS_PHONE_E164,
  BUSINESS_ADDRESS_LINE,
  FOOTER_GROUPS,
  whatsappLink,
} from "../../lib/site";
import SocialRow from "./SocialRow";

// Site-wide footer on the dark "build chamber" field. Surfaces the legal /
// policy pages and the business address from every page (a Google Business
// and e-commerce-rules requirement), and closes with the name at full width.
export default function SiteFooter() {
  const year = 2026;
  const waLink = whatsappLink("Hi! I have a question about ShilpSmith.");

  return (
    <footer className="relative isolate overflow-hidden bg-slate-950 text-slate-300">
      <div aria-hidden="true" className="plate-grid absolute inset-0 -z-10 opacity-40" />
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-20 sm:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <p className="font-display text-2xl font-bold tracking-tight text-white">ShilpSmith</p>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-slate-400">
              Premium 3D-printed gifts, decor, and custom commissions — designed
              and crafted on demand in {BUSINESS_COUNTRY}.
            </p>

            <ul className="mt-6 space-y-2.5 text-[15px]">
              {waLink && (
                <li>
                  <a href={waLink} target="_blank" rel="noreferrer" className="font-semibold text-white transition hover:text-brand-300">
                    Chat on WhatsApp →
                  </a>
                </li>
              )}
              {SUPPORT_EMAIL && (
                <li>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="transition hover:text-white">
                    {SUPPORT_EMAIL}
                  </a>
                </li>
              )}
              <li>
                <a href={`tel:${BUSINESS_PHONE_E164}`} className="font-mono transition hover:text-white">
                  {BUSINESS_PHONE}
                </a>
              </li>
              {/* Business address on every page — the e-commerce rules ask for
                  it, and it's the kind of detail customers check before paying. */}
              <li>
                <address className="not-italic text-slate-400">
                  {SITE_LEGAL_NAME}, {BUSINESS_ADDRESS_LINE}
                </address>
              </li>
            </ul>

            {/* Managed from admin → Settings → Social profiles. */}
            <SocialRow className="mt-6" />
          </div>

          {FOOTER_GROUPS.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">{group.title}</p>
              <ul className="mt-5 space-y-3 text-[15px]">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-slate-300 transition hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* The name returns at full width — the page's closing mark. */}
        <p
          aria-hidden="true"
          className="mt-20 select-none whitespace-nowrap text-center font-display font-bold leading-[0.8] tracking-[-0.06em] text-white/[0.06]"
          style={{ fontSize: "clamp(3.5rem, 15vw, 14rem)" }}
        >
          ShilpSmith
        </p>

        <div className="mt-8 flex flex-col gap-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {SITE_LEGAL_NAME}. All rights reserved.
          </p>
          <p className="flex flex-wrap gap-x-5 gap-y-1">
            <Link href="/terms" className="transition hover:text-slate-300">Terms</Link>
            <Link href="/privacy" className="transition hover:text-slate-300">Privacy</Link>
            <Link href="/shipping-returns" className="transition hover:text-slate-300">Shipping &amp; Returns</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
