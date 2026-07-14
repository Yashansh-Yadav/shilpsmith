interface OrderShippedData {
  orderNumber: string;
  customerName: string;
  carrierLabel?: string | null;
  trackingNumber?: string | null;
  trackingUrl: string;
  // Absolute URL to the public /track page (optional; falls back to none).
  trackPageUrl?: string | null;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderOrderShippedEmail(data: OrderShippedData) {
  const carrierRow = data.carrierLabel
    ? `<tr>
         <td style="padding:4px 0;color:#64748b;font-size:13px;">Carrier</td>
         <td style="padding:4px 0;text-align:right;font-size:13px;color:#0f172a;">${escapeHtml(
           data.carrierLabel
         )}</td>
       </tr>`
    : "";

  const numberRow = data.trackingNumber
    ? `<tr>
         <td style="padding:4px 0;color:#64748b;font-size:13px;">Tracking no.</td>
         <td style="padding:4px 0;text-align:right;font-size:13px;color:#0f172a;font-family:monospace;">${escapeHtml(
           data.trackingNumber
         )}</td>
       </tr>`
    : "";

  const trackPageLink = data.trackPageUrl
    ? `<p style="margin:16px 0 0 0;color:#64748b;font-size:12px;">
         You can also view your order status any time at
         <a href="${escapeHtml(
           data.trackPageUrl
         )}" style="color:#0f766e;">our order tracking page</a>.
       </p>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                 style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
            <tr>
              <td>
                <h1 style="margin:0 0 8px 0;font-size:22px;">Your order is on its way! &#128230;</h1>
                <p style="margin:0;color:#475569;font-size:14px;">
                  Hi ${escapeHtml(data.customerName)}, your ShilpSmith order
                  <strong>${escapeHtml(data.orderNumber)}</strong>
                  has been dispatched.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding-top:24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                       style="border-top:1px solid #e2e8f0;padding-top:12px;">
                  ${carrierRow}
                  ${numberRow}
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding-top:24px;">
                <a href="${escapeHtml(data.trackingUrl)}"
                   style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;
                          font-size:15px;font-weight:bold;padding:12px 24px;border-radius:10px;">
                  Track your shipment
                </a>
                ${trackPageLink}
              </td>
            </tr>

            <tr>
              <td style="padding-top:24px;color:#64748b;font-size:12px;">
                Questions about your delivery? Just reply to this email or message
                us on WhatsApp.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
