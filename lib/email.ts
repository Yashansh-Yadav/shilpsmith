import { Resend } from "resend";

import { logger } from "./logger";
import { renderOrderConfirmationEmail } from "./email/templates/orderConfirmation";

// Lazy Resend client. We tolerate a missing key in dev / for offline payment
// methods so the order flow still works end-to-end without email delivery.
let _resend: Resend | null = null;
function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

interface OrderEmailPayload {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  total: number | string | { toString(): string };
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number | string | { toString(): string };
  }>;
}

const FROM = process.env.RESEND_FROM_EMAIL || "ShilpSmith <orders@shilpsmith.com>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export async function sendOrderConfirmationEmail(order: OrderEmailPayload) {
  const client = getClient();
  if (!client) {
    logger.warn("Resend not configured, skipping order confirmation email", {
      orderNumber: order.orderNumber,
    });
    return { sent: false, reason: "no-resend-key" as const };
  }

  const html = renderOrderConfirmationEmail({
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    total: Number(order.total),
    items: order.items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
    })),
  });

  const recipients = [order.customerEmail];
  if (ADMIN_EMAIL) recipients.push(ADMIN_EMAIL);

  const result = await client.emails.send({
    from: FROM,
    to: recipients,
    subject: `ShilpSmith order ${order.orderNumber} confirmed`,
    html,
  });

  if (result.error) {
    logger.error("Resend rejected order confirmation", {
      error: result.error,
      orderNumber: order.orderNumber,
    });
    return { sent: false, reason: "resend-error" as const };
  }

  return { sent: true, id: result.data?.id };
}

interface SupportConcernPayload {
  name: string;
  email: string;
  phone?: string;
  category: string;
  orderNumber?: string;
  message: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Notify the business of a new support concern. Sent to ADMIN_EMAIL with the
// customer's address as reply-to so staff can respond directly. Fire-and-forget
// at the call site — never blocks the customer's submission.
export async function sendSupportConcernEmail(concern: SupportConcernPayload) {
  const client = getClient();
  if (!client || !ADMIN_EMAIL) {
    logger.warn("Resend/ADMIN_EMAIL not configured, skipping support email", {
      category: concern.category,
    });
    return { sent: false, reason: "not-configured" as const };
  }

  const rows: [string, string][] = [
    ["Name", concern.name],
    ["Email", concern.email],
    ["Phone", concern.phone || "—"],
    ["Category", concern.category],
    ["Order #", concern.orderNumber || "—"],
  ];

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:600px;margin:auto">
      <h2 style="margin:0 0 12px">New support request</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:6px 8px;color:#64748b;width:120px">${k}</td><td style="padding:6px 8px;font-weight:600">${escapeHtml(
                v
              )}</td></tr>`
          )
          .join("")}
      </table>
      <h3 style="margin:18px 0 6px">Message</h3>
      <p style="white-space:pre-wrap;font-size:14px;line-height:1.6;background:#f8fafc;padding:12px;border-radius:8px">${escapeHtml(
        concern.message
      )}</p>
    </div>`;

  const result = await client.emails.send({
    from: FROM,
    to: [ADMIN_EMAIL],
    replyTo: concern.email,
    subject: `Support: ${concern.category}${
      concern.orderNumber ? ` · ${concern.orderNumber}` : ""
    } — ${concern.name}`,
    html,
  });

  if (result.error) {
    logger.error("Resend rejected support concern", { error: result.error });
    return { sent: false, reason: "resend-error" as const };
  }

  return { sent: true, id: result.data?.id };
}
