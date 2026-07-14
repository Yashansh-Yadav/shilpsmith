import { logger } from "./logger";

// iThink Logistics — Track Order API client.
//
// Pulls live shipment status + scan history for an AWB. Tolerant of missing
// config like lib/email.ts / lib/whatsapp.ts: returns { configured:false } and
// logs instead of throwing, so the /track page keeps working (falling back to the
// manual status + link-out) until credentials are provisioned.
//
// Docs: POST {base}/api/order/track.json
//   body: { data: { awb_number_list, access_token, secret_key } }  (max 10 AWBs)
//   resp: { status_code, data: { ShipmentData: [ { Shipment: { Status, Scans[] } } ] } }
//
// Env:
//   ITHINK_ACCESS_TOKEN, ITHINK_SECRET_KEY  — from the iThink Logistics team
//   ITHINK_BASE_URL  — optional; default production. Use the pre-alpha host for
//                      staging: https://pre-alpha.ithinklogistics.com

const DEFAULT_BASE = "https://api.ithinklogistics.com";

export interface TrackingScan {
  status: string;
  statusCode: string;
  location: string;
  dateTime: string;
  instructions: string;
}

export interface LiveTracking {
  awb: string;
  current: {
    status: string;
    statusType: string;
    statusCode: string;
    location: string;
    dateTime: string;
  };
  origin: string;
  destination: string;
  scans: TrackingScan[];
  // When true, iThink reports this shipment as delivered — callers can stop
  // polling and (optionally) reflect it in their own status.
  delivered: boolean;
}

// `ok` is present in every member so it's a valid discriminant — lets callers
// narrow with `if (res.ok)` cleanly (a member missing the key breaks narrowing).
export type TrackResult =
  | { ok: false; configured: false }
  | { ok: false; configured: true; reason: string }
  | { ok: true; configured: true; data: LiveTracking };

function creds() {
  const access_token = process.env.ITHINK_ACCESS_TOKEN;
  const secret_key = process.env.ITHINK_SECRET_KEY;
  if (!access_token || !secret_key) return null;
  const base = (process.env.ITHINK_BASE_URL || DEFAULT_BASE).replace(/\/$/, "");
  return { access_token, secret_key, base };
}

export function isIThinkConfigured(): boolean {
  return creds() !== null;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

// A shipment counts as delivered when the status type/text says so. iThink uses
// StatusType "DL" for delivered; we also match the word defensively.
function isDelivered(statusType: string, status: string): boolean {
  const t = `${statusType} ${status}`.toLowerCase();
  return t.includes("dl") || t.includes("deliver");
}

// Track a single AWB. Returns normalized live tracking, or a typed failure that
// callers can ignore (falling back to manual status).
export async function trackShipment(awb: string): Promise<TrackResult> {
  const c = creds();
  if (!c) return { ok: false, configured: false };

  const trimmed = awb?.trim();
  if (!trimmed) return { ok: false, configured: true, reason: "no-awb" };

  let json: unknown;
  try {
    const res = await fetch(`${c.base}/api/order/track.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          awb_number_list: trimmed,
          access_token: c.access_token,
          secret_key: c.secret_key,
        },
      }),
      // Never let a slow aggregator hang the customer's page.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      logger.warn("iThink track API non-200", { status: res.status, awb: trimmed });
      return { configured: true, ok: false, reason: `http-${res.status}` };
    }
    json = await res.json();
  } catch (error) {
    logger.error("iThink track API request failed", { error, awb: trimmed });
    return { configured: true, ok: false, reason: "network" };
  }

  try {
    const root = json as {
      status_code?: number;
      data?: { ShipmentData?: Array<{ Shipment?: Record<string, unknown> }> };
    };
    const shipment = root?.data?.ShipmentData?.[0]?.Shipment as
      | Record<string, any>
      | undefined;
    if (!shipment) {
      return { configured: true, ok: false, reason: "not-found" };
    }

    const status = shipment.Status ?? {};
    const scansRaw: any[] = Array.isArray(shipment.Scans) ? shipment.Scans : [];
    const scans: TrackingScan[] = scansRaw
      .map((s) => s?.ScanDetail ?? {})
      .map((d) => ({
        status: str(d.Scan),
        statusCode: str(d.StatusCode),
        location: str(d.ScannedLocation),
        dateTime: str(d.ScanDateTime),
        instructions: str(d.Instructions),
      }))
      .filter((s) => s.status || s.location);

    const statusText = str(status.Status);
    const statusType = str(status.StatusType);

    const data: LiveTracking = {
      awb: str(shipment.AWB) || trimmed,
      current: {
        status: statusText,
        statusType,
        statusCode: str(status.StatusCode),
        location: str(status.StatusLocation),
        dateTime: str(status.StatusDateTime),
      },
      origin: str(shipment.Origin),
      destination: str(shipment.Destination),
      scans,
      delivered: isDelivered(statusType, statusText),
    };
    return { configured: true, ok: true, data };
  } catch (error) {
    logger.error("iThink track API parse failed", { error, awb: trimmed });
    return { configured: true, ok: false, reason: "parse" };
  }
}
