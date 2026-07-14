import { logger } from "./logger";

// WhatsApp Cloud API (Meta) sender. Reusable for BOTH admin alerts (to the
// configured WHATSAPP_NOTIFY_TO) and customer messages (to any recipient).
// Tolerant of missing config like lib/email.ts — returns {sent:false} and logs
// instead of throwing, so notifications never break a request.
//
// Two delivery modes per message:
//  - TEMPLATE (required for business-initiated messages outside the 24h window,
//    i.e. all order updates): pass a Meta-approved template name + positional
//    body params.
//  - TEXT (free-form): only delivered if the recipient messaged the business
//    number within the last 24h — handy for local testing.

const API_VERSION = "v21.0";

export type WhatsAppResult = { sent: boolean; reason?: string };

function creds() {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return null;
  return {
    token,
    phoneNumberId,
    lang: process.env.WHATSAPP_TEMPLATE_LANG || "en",
  };
}

export function whatsappConfigured(): boolean {
  return creds() !== null;
}

// Normalize an Indian phone to WhatsApp's international form (digits only, with
// country code). Accepts "9876543210", "+91 98765 43210", "098765 43210", etc.
export function normalizeWhatsAppNumber(raw: string | null | undefined): string {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.length === 10) d = "91" + d; // bare 10-digit Indian number
  else if (d.length === 11 && d.startsWith("0")) d = "91" + d.slice(1);
  return d;
}

// Template body params can't contain newlines/tabs or long whitespace runs.
function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, 1000);
}

async function post(payload: object): Promise<WhatsAppResult> {
  const c = creds();
  if (!c) {
    logger.warn("WhatsApp Cloud API not configured, skipping message");
    return { sent: false, reason: "not-configured" };
  }
  const url = `https://graph.facebook.com/${API_VERSION}/${c.phoneNumberId}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error("WhatsApp Cloud API rejected message", {
        status: res.status,
        body: body.slice(0, 500),
      });
      return { sent: false, reason: "api-error" };
    }
    return { sent: true };
  } catch (error) {
    logger.error("WhatsApp Cloud API request failed", { error });
    return { sent: false, reason: "network" };
  }
}

// Send a Meta-approved template to any recipient with positional body params.
export async function sendWhatsAppTemplate(opts: {
  to: string;
  template: string;
  lang?: string;
  params?: string[];
}): Promise<WhatsAppResult> {
  const to = normalizeWhatsAppNumber(opts.to);
  if (!to) return { sent: false, reason: "no-recipient" };
  const c = creds();
  return post({
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: opts.template,
      language: { code: opts.lang || c?.lang || "en" },
      components:
        opts.params && opts.params.length
          ? [
              {
                type: "body",
                parameters: opts.params.map((p) => ({
                  type: "text",
                  text: oneLine(p),
                })),
              },
            ]
          : [],
    },
  });
}

// Free-form text (only delivered within the 24h customer-service window).
export async function sendWhatsAppText(opts: {
  to: string;
  body: string;
}): Promise<WhatsAppResult> {
  const to = normalizeWhatsAppNumber(opts.to);
  if (!to) return { sent: false, reason: "no-recipient" };
  return post({
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { preview_url: false, body: opts.body },
  });
}

// Admin alert to the configured WHATSAPP_NOTIFY_TO. Uses WHATSAPP_TEMPLATE_NAME
// (single {{1}} body param) when set, else free-form text. Unchanged behavior —
// consumed by lib/notify.ts.
export async function sendWhatsAppNotification(opts: {
  text: string;
  summary: string;
}): Promise<WhatsAppResult> {
  const to = process.env.WHATSAPP_NOTIFY_TO;
  if (!to) {
    logger.warn("WHATSAPP_NOTIFY_TO not set, skipping admin WhatsApp");
    return { sent: false, reason: "not-configured" };
  }
  const template = process.env.WHATSAPP_TEMPLATE_NAME || "";
  return template
    ? sendWhatsAppTemplate({ to, template, params: [opts.summary] })
    : sendWhatsAppText({ to, body: opts.text });
}
