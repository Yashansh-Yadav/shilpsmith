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

export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

// Primary nav (shared header) and the footer link groups. Centralized so the
// footer always surfaces the compliance pages site-wide.
export const PRIMARY_NAV = [
  { href: "/search", label: "Shop" },
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
      { href: "/search?customizable=true", label: "Custom orders" },
      { href: "/search?sort=featured", label: "Featured" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/contact", label: "Support / Contact" },
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
