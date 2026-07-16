"use client";

import { useEffect, useState } from "react";

import { DEFAULT_SHIPPING, type ShippingConfig } from "./shipping";

// Module-level cache so we fetch the shipping rule once per page load, not once
// per component that shows pricing (cart sheet + cart page + checkout).
let cached: ShippingConfig | null = null;

/**
 * Reads the admin-configured shipping rule for display. The order route is
 * still authoritative for what's billed; this just keeps the cart/checkout in
 * step. Falls back to the default rule until the fetch resolves.
 */
export function useShippingConfig(): ShippingConfig {
  const [config, setConfig] = useState<ShippingConfig>(cached ?? DEFAULT_SHIPPING);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    fetch("/api/settings/shipping")
      .then((r) => r.json())
      .then((body) => {
        if (cancelled || !body?.success) return;
        cached = body.data as ShippingConfig;
        setConfig(cached);
      })
      .catch(() => {
        /* keep the default on any error */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}