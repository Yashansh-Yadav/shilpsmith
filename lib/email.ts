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
