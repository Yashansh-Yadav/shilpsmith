import Link from "next/link";
import { Mail, MessageCircle } from "lucide-react";

import {
  SITE_NAME,
  SITE_LEGAL_NAME,
  SUPPORT_EMAIL,
  BUSINESS_COUNTRY,
  FOOTER_GROUPS,
  SOCIAL_LINKS,
  whatsappLink,
} from "../../lib/site";

// Site-wide footer. Surfaces the legal/policy pages from every page (a Google
// Business / trust requirement) plus contact channels.
export default function SiteFooter() {
  const year = 2026;
  const socials = Object.entries(SOCIAL_LINKS).filter(([, url]) => url);
  const waLink = whatsappLink("Hi! I have a question about ShilpSmith.");

  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand + contact */}
          <div className="lg:col-span-2">
            <p className="text-lg font-black text-white">{SITE_NAME}</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-400">
              Premium 3D-printed gifts, decor, and custom commissions — designed
              and crafted on demand in {BUSINESS_COUNTRY}.
            </p>

            <div className="mt-5 space-y-2 text-sm">
              {SUPPORT_EMAIL && (
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="inline-flex items-center gap-2 text-slate-300 transition hover:text-white"
                >
                  <Mail className="h-4 w-4" />
                  {SUPPORT_EMAIL}
                </a>
              )}
              {waLink && (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-slate-300 transition hover:text-white"
                >
                  <MessageCircle className="h-4 w-4" />
                  Chat on WhatsApp
                </a>
              )}
            </div>

            {socials.length > 0 && (
              <div className="mt-5 flex gap-3 text-sm">
                {socials.map(([name, url]) => (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="capitalize text-slate-400 transition hover:text-white"
                  >
                    {name}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Link groups */}
          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {group.title}
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-slate-300 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-slate-800 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {SITE_LEGAL_NAME}. All rights reserved.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/terms" className="hover:text-slate-300">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-slate-300">
              Privacy
            </Link>
            <Link href="/shipping-returns" className="hover:text-slate-300">
              Shipping &amp; Returns
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
