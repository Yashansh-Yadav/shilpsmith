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

  // Customer-only — the admin gets its own richer alert via lib/notify.ts
  // (email + WhatsApp), so we don't double-send here.
  const result = await client.emails.send({
    from: FROM,
    to: [order.customerEmail],
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

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Generic admin-facing email, used by the notification dispatcher (lib/notify.ts)
// for new orders / reviews / support requests. Sends only to ADMIN_EMAIL; the
// caller passes `replyTo` (e.g. the customer's address) where relevant.
export async function sendAdminEmail(opts: {
  subject: string;
  html: string;
  replyTo?: string;
}) {
  const client = getClient();
  if (!client || !ADMIN_EMAIL) {
    logger.warn("Resend/ADMIN_EMAIL not configured, skipping admin email", {
      subject: opts.subject,
    });
    return { sent: false, reason: "not-configured" as const };
  }

  const result = await client.emails.send({
    from: FROM,
    to: [ADMIN_EMAIL],
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    subject: opts.subject,
    html: opts.html,
  });

  if (result.error) {
    logger.error("Resend rejected admin email", { error: result.error });
    return { sent: false, reason: "resend-error" as const };
  }

  return { sent: true, id: result.data?.id };
}
