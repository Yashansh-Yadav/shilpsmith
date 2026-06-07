import type { Metadata } from "next";
import Link from "next/link";

import PageShell from "../../components/site/PageShell";
import { PageHeader, Prose } from "../../components/site/Prose";
import { SITE_LEGAL_NAME, SUPPORT_EMAIL, BUSINESS_COUNTRY } from "../../lib/site";

export const metadata: Metadata = {
  title: "Shipping & Returns",
  description: `Shipping timelines, charges, cancellations, returns, and refunds for orders from ${SITE_LEGAL_NAME}.`,
  alternates: { canonical: "/shipping-returns" },
};

export default function ShippingReturnsPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Policies"
        title="Shipping & Returns"
        intro={`Everything you need to know about how we ship your order across ${BUSINESS_COUNTRY}, and how cancellations, returns, and refunds work.`}
        showUpdated
      />
      <Prose>
        <h2>Shipping</h2>

        <h3>Where we ship</h3>
        <p>We currently ship across {BUSINESS_COUNTRY}.</p>

        <h3>Processing &amp; dispatch time</h3>
        <ul>
          <li>
            <strong>Ready-to-buy items</strong> are typically printed,
            quality-checked, and dispatched within 1–3 business days of order
            confirmation.
          </li>
          <li>
            <strong>Personalized &amp; custom items</strong> are made to order;
            production time depends on the design and is confirmed with you before
            we begin. Larger or complex commissions may take longer.
          </li>
        </ul>

        <h3>Delivery time</h3>
        <p>
          Once dispatched, delivery usually takes 3–7 business days depending on
          your location and the courier. Remote areas may take longer. Estimated
          timelines are not guaranteed and may be affected by factors outside our
          control (weather, courier delays, public holidays).
        </p>

        <h3>Shipping charges</h3>
        <p>
          Shipping is calculated at checkout. A flat shipping fee applies to
          smaller orders, and orders above the published threshold qualify for
          free shipping. The exact amount is always shown before you pay.
        </p>

        <h3>Order tracking</h3>
        <p>
          Where tracking is available, we&apos;ll share the details over your
          chosen contact channel (WhatsApp or email) once your order ships.
        </p>

        <h2>Cancellations</h2>
        <ul>
          <li>
            Orders for ready-to-buy items can be cancelled before dispatch for a
            full refund.
          </li>
          <li>
            <strong>Personalized and custom orders</strong> cannot be cancelled
            once production has begun, as they are made specifically for you.
          </li>
        </ul>

        <h2>Returns &amp; replacements</h2>
        <p>
          We want you to be happy with your order. If something is wrong, contact
          us within <strong>48 hours of delivery</strong> with photos and your
          order number.
        </p>
        <h3>We will replace or refund items that are:</h3>
        <ul>
          <li>Damaged or broken in transit.</li>
          <li>Defective or materially different from what you ordered.</li>
          <li>Incorrect (wrong item shipped).</li>
        </ul>
        <h3>We generally cannot accept returns for:</h3>
        <ul>
          <li>
            Personalized or custom-made items, unless they arrived damaged or
            defective.
          </li>
          <li>
            Minor variations in color, texture, or finish that are normal for
            3D-printed products.
          </li>
          <li>Items damaged through misuse after delivery.</li>
        </ul>

        <h2>Refunds</h2>
        <p>
          Approved refunds are issued to your original payment method (for prepaid
          orders) or via an agreed method for Cash on Delivery orders. Refunds are
          typically processed within 5–7 business days of approval; the time for
          the amount to reflect depends on your bank or payment provider.
        </p>

        <h2>Damaged or missing parcels</h2>
        <p>
          If your parcel arrives damaged or doesn&apos;t arrive within the
          expected window, please reach out right away so we can investigate with
          the courier and make it right.
        </p>

        <h2>Need help?</h2>
        <p>
          For anything related to shipping, cancellations, returns, or refunds,
          raise a request on our <Link href="/contact">support page</Link>
          {SUPPORT_EMAIL ? (
            <>
              {" "}
              or email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </>
          ) : null}
          . These terms should be read together with our{" "}
          <Link href="/terms">Terms &amp; Conditions</Link>.
        </p>
      </Prose>
    </PageShell>
  );
}
