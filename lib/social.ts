// lib/social.ts
//
// Business social profiles. These are stored in the `social` Settings row (one
// key per platform, value = profile URL) and surface in two places:
//
//   1. The footer, as a row of links customers can click.
//   2. `sameAs` on the Organization JSON-LD in the root layout.
//
// (2) is the one that matters for search/AI: `sameAs` is how Google and LLM
// answer engines tie a brand's website to its profiles. With it empty, they
// guess from name similarity — which is how an unrelated account ends up
// attributed to your business.
//
// Pure data + string handling (no Prisma, no React) so the admin form, the
// server resolver, and the client footer all share one definition.

export interface SocialPlatform {
  key: string;
  label: string;
  placeholder: string;
}

// Order here is the display order in the footer and in `sameAs`.
export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourhandle" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourpage" },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/yourhandle" },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourchannel" },
  { key: "reddit", label: "Reddit", placeholder: "https://reddit.com/user/yourhandle" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/company/yourcompany" },
  { key: "pinterest", label: "Pinterest", placeholder: "https://pinterest.com/yourhandle" },
  { key: "threads", label: "Threads", placeholder: "https://threads.net/@yourhandle" },
];

export interface SocialLink {
  key: string;
  label: string;
  url: string;
}

/**
 * Accept what an admin actually types. "instagram.com/shilpsmith" and
 * "@shilpsmith" pasted from a phone are the common cases; a bare handle can't
 * be resolved to a URL so it's rejected rather than guessed at.
 *
 * Returns null when the input can't be made into an absolute http(s) URL —
 * callers drop those, so a typo never reaches `sameAs` (a broken URL there is
 * worse than no URL: it tells the crawler the brand claims a profile that
 * doesn't resolve).
 */
export function normalizeSocialUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  // A hostname with no dot ("@shilpsmith", "shilpsmith") isn't a real profile URL.
  if (!parsed.hostname.includes(".")) return null;

  return parsed.toString();
}

/**
 * Turn a stored `social` Settings value into display-ready links, in catalog
 * order, dropping empty and malformed entries.
 */
export function resolveSocialLinks(value: unknown): SocialLink[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;

  const out: SocialLink[] = [];
  for (const platform of SOCIAL_PLATFORMS) {
    const url = normalizeSocialUrl(record[platform.key]);
    if (url) out.push({ key: platform.key, label: platform.label, url });
  }
  return out;
}
