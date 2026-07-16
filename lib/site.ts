// lib/site.ts
//
// Single source of truth for public site identity — used by metadata, sitemap,
// robots, JSON-LD structured data, the footer, and the legal pages. Keep
// business-facing constants here so there's one place to update for compliance.

// Production origin. Override per-environment via NEXT_PUBLIC_SITE_URL (Vercel).
// Trailing slash stripped so we can safely concatenate paths.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://shilpsmith.com"
).replace(/\/$/, "");

export const SITE_NAME = "ShilpSmith";
export const SITE_LEGAL_NAME = "ShilpSmith 3D Studio";
export const SITE_DESCRIPTION =
  "Premium 3D-printed gifts, decor, and custom commissions — personalized and crafted on demand in India.";
export const SITE_TAGLINE = "Bring your ideas to life with premium 3D prints.";

// Contact / business details. Email destinations for transactional mail are
// still driven by RESEND_* / ADMIN_EMAIL env on the server; these are the
// public-facing addresses shown on the site.
// Both sourced from env (no hardcoded values). Empty when unset — callers guard
// rendering so nothing broken shows, and the support page still works.
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
export const BUSINESS_COUNTRY = "India";

// Default Open Graph / social share image (lives in /public).
export const OG_IMAGE = "/heroImage_v1.png";
export const BRAND_LOGO = "/brandLogo_figure.png";

// Shown on legal pages. Constant (not new Date()) so it doesn't churn on every
// render/build — bump it when you actually revise a policy.
export const POLICY_LAST_UPDATED = "June 7, 2026";

// Optional social profiles — fill in real URLs to strengthen the Organization
// `sameAs` graph (helps Google associate the brand). Empty entries are skipped.
export const SOCIAL_LINKS = {
  instagram: "",
  facebook: "",
  youtube: "",
};

// Normalize an Indian phone to WhatsApp's international form (digits only, with
// country code). Accepts "9876543210", "+91 98765 43210", "098765 43210", etc.
//
// Canonical copy lives here rather than in lib/whatsapp.ts because this module
// is dependency-free and safe to pull into the client bundle; lib/whatsapp.ts
// imports it from here.
export function normalizeWhatsAppNumber(raw: string | null | undefined): string {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 10) d = "91" + d; // bare 10-digit Indian number
  else if (d.length === 11 && d.startsWith("0")) d = "91" + d.slice(1);
  return d;
}

// wa.me requires a full international number. A bare 10-digit Indian number
// (which is what the env has historically held) silently produces an
// invalid-number error page — so normalize here rather than trusting the env to
// be formatted correctly. Returns null when there's no usable number so callers
// can skip rendering the CTA instead of linking to wa.me/undefined.
export function whatsappLink(message?: string): string | null {
  const number = normalizeWhatsAppNumber(WHATSAPP_NUMBER);
  if (!number) return null;
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

// Primary nav (shared header) and the footer link groups. Centralized so the
// footer always surfaces the compliance pages site-wide.
export const PRIMARY_NAV = [
  { href: "/search", label: "Shop" },
  { href: "/smart-idols", label: "Smart Idols" },
  { href: "/track", label: "Track Order" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Support" },
];

export const FOOTER_GROUPS: {
  title: string;
  links: { href: string; label: string }[];
}[] = [
  {
    title: "Shop",
    links: [
      { href: "/search", label: "All products" },
      { href: "/smart-idols", label: "Smart NFC idols" },
      { href: "/search?customizable=true", label: "Custom orders" },
      { href: "/search?sort=featured", label: "Featured" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/contact", label: "Support / Contact" },
      { href: "/track", label: "Track order" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms & Conditions" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/shipping-returns", label: "Shipping & Returns" },
    ],
  },
];
