import { logger } from "./logger";
import { sendAdminEmail, escapeHtml } from "./email";
import { sendWhatsAppNotification } from "./whatsapp";
import { SITE_URL } from "./site";

// Note: Telegram is intentionally not used (banned in India). Admin alerts go
// out over Email + WhatsApp only. lib/telegram.ts is kept but unwired.

// Single admin-notification dispatcher. Fans a single event out to every
// configured channel (email + WhatsApp). Each channel is independently tolerant
// of missing config, and one failing never affects the other or the caller.
//
// Call fire-and-forget from request handlers (always `.catch()`), exactly like
// the order-confirmation email — notifications must never block or fail the
// customer's action.

export interface AdminNotification {
  type: "order" | "review" | "support";
  title: string; // headline / email subject, e.g. "New order ORD-..."
  lines: { label: string; value: string }[]; // key facts (rendered as a table)
  body?: string; // optional long text (review comment / support message)
  path?: string; // admin link path, e.g. "/admin/orders/12"
  replyTo?: string; // customer email, used as email reply-to where relevant
}

const TYPE_EMOJI = { order: "🛒", review: "⭐", support: "🛟" } as const;

function buildSummary(n: AdminNotification): string {
  const facts = n.lines.map((l) => l.value).filter(Boolean).join(" · ");
  return `${TYPE_EMOJI[n.type]} ${n.title}${facts ? ` — ${facts}` : ""}`;
}

function buildText(n: AdminNotification): string {
  const parts = [`${TYPE_EMOJI[n.type]} ${n.title}`, ""];
  for (const l of n.lines) parts.push(`${l.label}: ${l.value}`);
  if (n.body) parts.push("", n.body);
  if (n.path) parts.push("", `${SITE_URL}${n.path}`);
  return parts.join("\n");
}

function buildHtml(n: AdminNotification): string {
  const rows = n.lines
    .map(
      (l) =>
        `<tr><td style="padding:6px 8px;color:#64748b;width:130px">${escapeHtml(
          l.label
        )}</td><td style="padding:6px 8px;font-weight:600">${escapeHtml(
          l.value
        )}</td></tr>`
    )
    .join("");

  const bodyBlock = n.body
    ? `<h3 style="margin:18px 0 6px;font-size:14px">Details</h3><p style="white-space:pre-wrap;font-size:14px;line-height:1.6;background:#f8fafc;padding:12px;border-radius:8px">${escapeHtml(
        n.body
      )}</p>`
    : "";

  const linkBlock = n.path
    ? `<p style="margin-top:16px"><a href="${SITE_URL}${n.path}" style="display:inline-block;background:#059669;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;font-size:14px">Open in admin</a></p>`
    : "";

  return `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:auto">
      <h2 style="margin:0 0 12px;font-size:18px">${escapeHtml(n.title)}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
      ${bodyBlock}
      ${linkBlock}
    </div>`;
}

export async function notifyAdmin(n: AdminNotification): Promise<void> {
  const text = buildText(n);

  // Each channel self-disables when its env isn't set, so this fans out to
  // whatever is configured (Email + WhatsApp).
  const channels: [string, Promise<unknown>][] = [
    ["email", sendAdminEmail({ subject: n.title, html: buildHtml(n), replyTo: n.replyTo })],
    ["whatsapp", sendWhatsAppNotification({ text, summary: buildSummary(n) })],
  ];

  const results = await Promise.allSettled(channels.map(([, p]) => p));
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      logger.error("admin notification channel threw", {
        channel: channels[i][0],
        type: n.type,
        error: r.reason,
      });
    }
  });
}
