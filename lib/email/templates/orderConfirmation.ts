interface Item {
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface OrderConfirmationData {
  orderNumber: string;
  customerName: string;
  total: number;
  items: Item[];
}

function rupee(n: number) {
  return `&#8377;${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderOrderConfirmationEmail(data: OrderConfirmationData) {
  const rows = data.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;font-size:14px;color:#0f172a;">
            ${escapeHtml(item.productName)}
            <div style="color:#64748b;font-size:12px;">Qty: ${item.quantity}</div>
          </td>
          <td style="padding:8px 0;text-align:right;font-size:14px;color:#0f172a;">
            ${rupee(item.unitPrice * item.quantity)}
          </td>
        </tr>
      `
    )
    .join("");

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
                <h1 style="margin:0 0 8px 0;font-size:22px;">Thanks, ${escapeHtml(
                  data.customerName
                )}!</h1>
                <p style="margin:0;color:#475569;font-size:14px;">
                  Your ShilpSmith order
                  <strong>${escapeHtml(data.orderNumber)}</strong>
                  has been received. We'll reach out shortly to confirm
                  production details.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding-top:24px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                       style="border-top:1px solid #e2e8f0;">
                  ${rows}
                  <tr>
                    <td style="padding-top:12px;border-top:1px solid #e2e8f0;font-size:15px;font-weight:bold;">
                      Total
                    </td>
                    <td style="padding-top:12px;border-top:1px solid #e2e8f0;text-align:right;font-size:15px;font-weight:bold;">
                      ${rupee(data.total)}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding-top:24px;color:#64748b;font-size:12px;">
                If anything looks off, reply to this email or message us on
                WhatsApp and we'll sort it out.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
