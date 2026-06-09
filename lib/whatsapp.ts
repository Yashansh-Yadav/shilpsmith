import { logger } from "./logger";

// WhatsApp Cloud API (Meta) sender for admin alerts. Tolerant of missing config
// like lib/email.ts — returns {sent:false} and logs instead of throwing so the
// notification dispatcher never breaks a user request.
//
// Two modes:
//  - TEMPLATE (recommended for production): set WHATSAPP_TEMPLATE_NAME. Required
//    for business-initiated messages outside the 24h customer-service window.
//    The template must have a single body parameter {{1}}; we pass a one-line
//    summary into it (template params can't contain newlines/tabs, so the full
//    multi-line text is only used in free-form mode).
//  - TEXT (free-form): no template name set. Only delivered if the recipient
//    messaged the business number within the last 24h — handy for local testing.

const API_VERSION = "v21.0";

function config() {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = process.env.WHATSAPP_NOTIFY_TO;
  if (!token || !phoneNumberId || !to) return null;
  return {
    token,
    phoneNumberId,
    to,
    template: process.env.WHATSAPP_TEMPLATE_NAME || "",
    lang: process.env.WHATSAPP_TEMPLATE_LANG || "en",
  };
}

// Collapse to a single line — template body parameters reject newlines, tabs,
// and runs of 4+ spaces.
function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, 1000);
}

export async function sendWhatsAppNotification(opts: {
  text: string; // full multi-line message (free-form mode)
  summary: string; // single-line summary (template parameter)
}): Promise<{ sent: boolean; reason?: string }> {
  const c = config();
  if (!c) {
    logger.warn("WhatsApp Cloud API not configured, skipping notification");
    return { sent: false, reason: "not-configured" };
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${c.phoneNumberId}/messages`;

  const payload = c.template
    ? {
        messaging_product: "whatsapp",
        to: c.to,
        type: "template",
        template: {
          name: c.template,
          language: { code: c.lang },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: oneLine(opts.summary) }],
            },
          ],
        },
      }
    : {
        messaging_product: "whatsapp",
        to: c.to,
        type: "text",
        text: { preview_url: false, body: opts.text },
      };

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
