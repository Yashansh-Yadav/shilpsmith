import { logger } from "./logger";
import { sendWhatsAppTemplate, sendWhatsAppText } from "./whatsapp";

// Customer-facing WhatsApp updates across the order lifecycle, plus a support
// acknowledgement. Always call fire-and-forget with `.catch()` — these must
// never block or fail the customer's action.
//
// Order updates are business-initiated (outside the 24h window), so production
// delivery REQUIRES a Meta-approved template. Use ONE generic template for all
// statuses with three body params: {{1}} name, {{2}} order number, {{3}} status
// phrase. Example template body:
//   "Namaste {{1}}, your ShilpSmith order {{2}} is {{3}}. Thank you!"
// Set its name in WHATSAPP_TEMPLATE_ORDER. Without a template we fall back to
// free-form text (testing only).

type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "BY_MISTAKE";

// Phrase dropped into {{3}} of the order template. `null` = don't message the
// customer for that status (internal-only).
const STATUS_PHRASE: Record<OrderStatus, string | null> = {
  PENDING: "received and is being reviewed",
  CONFIRMED: "confirmed",
  PROCESSING: "being prepared",
  SHIPPED: "dispatched and on its way visit https://shilpsmith.com/track to track your order",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
  BY_MISTAKE: null,
};

export interface CustomerOrderLike {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
}

export interface OrderTracking {
  carrier?: string | null;
  number?: string | null;
  url?: string | null;
}

// Notify the customer about an order status. Safe to call for any status —
// no-ops for statuses with no customer message (e.g. BY_MISTAKE) or a missing
// phone. Fire-and-forget at call sites.
//
// On SHIPPED, when a tracking URL is available it is appended to the free-form
// message and passed as an OPTIONAL 4th template param ({{4}}). Keep the order
// template's first three params as name / order number / status phrase; only add
// {{4}} to the template if you want the link inline (Meta ignores extra body
// params only if the template declares them, so a 3-param template still works
// because we omit {{4}} when there's no tracking URL — see below).
export async function notifyCustomerOrder(
  order: CustomerOrderLike,
  status: string,
  tracking?: OrderTracking
): Promise<void> {
  const phrase = STATUS_PHRASE[status as OrderStatus];
  // Log the skips — a silent return here looks identical to "never called".
  if (!phrase) {
    logger.info("customer order WhatsApp skipped: no message for status", {
      orderNumber: order.orderNumber,
      status,
    });
    return; // unknown / internal status → no customer message
  }
  if (!order.customerPhone) {
    logger.warn("customer order WhatsApp skipped: order has no phone", {
      orderNumber: order.orderNumber,
      status,
    });
    return;
  }

  logger.info("customer order WhatsApp sending", {
    orderNumber: order.orderNumber,
    status,
  });

  const trackingUrl =
    status === "SHIPPED" ? tracking?.url?.trim() || "" : "";

  const template = process.env.WHATSAPP_TEMPLATE_ORDER || "";
  const fallback =
    `Namaste ${order.customerName}, your ShilpSmith order ${order.orderNumber} is ${phrase}.` +
    (trackingUrl ? ` Track it here: ${trackingUrl}` : "") +
    ` Thank you for shopping with us!`;

  // Only send {{4}} when we actually have a tracking URL AND the deployment uses
  // a 4-param template (WHATSAPP_TEMPLATE_ORDER_HAS_TRACKING=1). Otherwise stick
  // to the 3-param body so existing approved templates keep working.
  const templateHasTracking =
    process.env.WHATSAPP_TEMPLATE_ORDER_HAS_TRACKING === "1";
  const params =
    trackingUrl && templateHasTracking
      ? [order.customerName, order.orderNumber, phrase, trackingUrl]
      : [order.customerName, order.orderNumber, phrase];

  const res = template
    ? await sendWhatsAppTemplate({
        to: order.customerPhone,
        template,
        params,
      })
    : await sendWhatsAppText({ to: order.customerPhone, body: fallback });

  if (!res.sent && res.reason && res.reason !== "not-configured") {
    logger.warn("customer order WhatsApp not sent", {
      orderNumber: order.orderNumber,
      status,
      reason: res.reason,
    });
  }
}

// Acknowledge a support request to the customer (if they left a phone).
// Optional template WHATSAPP_TEMPLATE_SUPPORT with a single {{1}} name param.
export async function notifyCustomerSupport(opts: {
  name: string;
  phone?: string | null;
}): Promise<void> {
  if (!opts.phone) return;
  const template = process.env.WHATSAPP_TEMPLATE_SUPPORT || "";
  const fallback = `Namaste ${opts.name}, we've received your request. Our team will get back to you soon. — ShilpSmith`;

  await (template
    ? sendWhatsAppTemplate({
        to: opts.phone,
        template,
        params: [opts.name],
      })
    : sendWhatsAppText({ to: opts.phone, body: fallback }));
}
