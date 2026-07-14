// lib/carriers.ts
//
// Shipment carrier registry. Plain data (no React/Node deps) so it can be shared
// by the admin order UI, the server-side order update route, and the customer
// track page — same pattern as lib/customization.ts.
//
// Each carrier has a `trackingUrlTemplate` with a `{trackingNumber}` placeholder.
// `resolveTrackingUrl()` builds the customer-facing link from a carrier + number,
// or accepts a manual override URL for carriers not in this list.

export interface Carrier {
  key: string;
  label: string;
  // URL template with a literal `{trackingNumber}` placeholder. `null` for the
  // catch-all "other" carrier, which requires an explicit manual URL instead.
  trackingUrlTemplate: string | null;
}

export const CARRIERS: Carrier[] = [
  {
    key: "delhivery",
    label: "Delhivery",
    trackingUrlTemplate:
      "https://www.delhivery.com/track/package/{trackingNumber}",
  },
  {
    key: "bluedart",
    label: "BlueDart",
    trackingUrlTemplate:
      "https://www.bluedart.com/tracking?trackFor=0&trackNo={trackingNumber}",
  },
  {
    key: "indiapost",
    label: "India Post",
    trackingUrlTemplate:
      "https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?consignment={trackingNumber}",
  },
  {
    key: "dtdc",
    label: "DTDC",
    trackingUrlTemplate:
      "https://www.dtdc.in/tracking/tracking_results.asp?strCnno={trackingNumber}",
  },
  {
    key: "shiprocket",
    label: "Shiprocket",
    trackingUrlTemplate: "https://shiprocket.co/tracking/{trackingNumber}",
  },
  {
    key: "ekart",
    label: "Ekart",
    trackingUrlTemplate:
      "https://ekartlogistics.com/shipmenttrack/{trackingNumber}",
  },
  {
    key: "xpressbees",
    label: "XpressBees",
    trackingUrlTemplate: "https://www.xpressbees.com/track?awb={trackingNumber}",
  },
  {
    key: "other",
    label: "Other / manual link",
    trackingUrlTemplate: null,
  },
];

export function getCarrier(key: string | null | undefined): Carrier | undefined {
  if (!key) return undefined;
  return CARRIERS.find((c) => c.key === key);
}

// Human-readable carrier name for display. Falls back to the raw key so a
// carrier later removed from the registry still renders something sensible.
export function carrierLabel(key: string | null | undefined): string {
  if (!key) return "";
  return getCarrier(key)?.label ?? key;
}

// Resolve the customer-facing tracking URL. Priority:
//   1. an explicit non-empty `manualUrl` (admin override / "other" carrier)
//   2. the carrier template filled with `trackingNumber`
//   3. null when neither is available
export function resolveTrackingUrl(
  carrierKey: string | null | undefined,
  trackingNumber: string | null | undefined,
  manualUrl?: string | null
): string | null {
  const manual = manualUrl?.trim();
  if (manual) return manual;

  const number = trackingNumber?.trim();
  if (!number) return null;

  const carrier = getCarrier(carrierKey);
  if (!carrier?.trackingUrlTemplate) return null;

  return carrier.trackingUrlTemplate.replace(
    "{trackingNumber}",
    encodeURIComponent(number)
  );
}
