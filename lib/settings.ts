import { unstable_cache } from "next/cache";

import { prisma } from "./prisma";
import { DEFAULT_SHIPPING, type ShippingConfig } from "./shipping";
import { resolveSocialLinks, type SocialLink } from "./social";

// Coerce the various truthy shapes the admin UI / JSON column can store
// (boolean true, "true", "1", "on") into a real boolean.
function toBool(v: unknown): boolean {
  return v === true || v === "true" || v === "1" || v === "on";
}

// The admin form stores numbers as strings ("0", "50"); coerce, and treat
// blank/absent as "not set".
function toNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Shipping rule from the `shipping` Settings row (admin → Settings → Shipping).
 * Falls back to the historical default (₹50 flat, free over ₹1000) only when no
 * row exists — an explicit flatRate of 0 means free shipping and is honoured.
 */
export async function getShippingConfig(): Promise<ShippingConfig> {
  try {
    const row = await prisma.settings.findUnique({ where: { key: "shipping" } });
    if (!row) return DEFAULT_SHIPPING;
    const value = row.value as Record<string, unknown> | null;
    if (!value) return DEFAULT_SHIPPING;

    const flatRate = toNum(value.flatRate);
    const freeAbove = toNum(value.freeAbove);
    return {
      // Missing flatRate → default; explicit 0 → free (honoured, not defaulted).
      flatRate: flatRate ?? DEFAULT_SHIPPING.flatRate,
      // Missing freeAbove → no free threshold.
      freeAbove: freeAbove,
    };
  } catch {
    // Missing table / DB hiccup — fall back to the default rule.
    return DEFAULT_SHIPPING;
  }
}

/**
 * Whether online (Razorpay) payments are enabled. Backed by the `payments`
 * Settings row, toggled from the admin Settings page. Defaults to **false** —
 * online payments stay off until an admin explicitly turns them on.
 */
export async function getOnlinePaymentsEnabled(): Promise<boolean> {
  try {
    const row = await prisma.settings.findUnique({ where: { key: "payments" } });
    const value = row?.value as Record<string, unknown> | null | undefined;
    return toBool(value?.onlineEnabled);
  } catch {
    // Missing table / row / DB hiccup — fail closed (off).
    return false;
  }
}

/** Cache tag for the `social` Settings row — revalidated when an admin saves. */
export const SOCIAL_CACHE_TAG = "settings:social";

/**
 * Business social profiles (admin → Settings → Social profiles).
 *
 * Cached because this is read by the ROOT layout, i.e. on every page: without
 * the cache each page render would pay another Neon roundtrip just to draw the
 * footer. The admin save calls `revalidateTag(SOCIAL_CACHE_TAG)`, so edits show
 * up immediately rather than after the 5-minute window.
 */
export const getSocialLinks = unstable_cache(
  async (): Promise<SocialLink[]> => {
    try {
      const row = await prisma.settings.findUnique({ where: { key: "social" } });
      return resolveSocialLinks(row?.value);
    } catch {
      // Missing table / row / DB hiccup — render no social links rather than 500.
      return [];
    }
  },
  ["settings-social"],
  { revalidate: 300, tags: [SOCIAL_CACHE_TAG] }
);
