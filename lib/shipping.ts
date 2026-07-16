// lib/shipping.ts
//
// Single source of truth for the shipping charge. Pure and dependency-free so
// the cart (client) and the order route (server) compute the same number.
// The admin sets these values under Settings → Shipping; getShippingConfig in
// lib/settings.ts reads them, and this file turns them into a charge.

export interface ShippingConfig {
  /** Flat fee charged per order. 0 (or less) means shipping is always free. */
  flatRate: number;
  /** Subtotal at/above which shipping is free. null = no free threshold. */
  freeAbove: number | null;
}

// Used when no shipping row exists yet — mirrors the historical hardcoded rule.
export const DEFAULT_SHIPPING: ShippingConfig = { flatRate: 50, freeAbove: 1000 };

export function computeShipping(
  subtotal: number,
  config: ShippingConfig = DEFAULT_SHIPPING
): number {
  if (subtotal <= 0) return 0;
  // Admin set the fee to 0 → free shipping, full stop.
  if (config.flatRate <= 0) return 0;
  // Free over the threshold, when one is set.
  if (config.freeAbove != null && subtotal >= config.freeAbove) return 0;
  return config.flatRate;
}