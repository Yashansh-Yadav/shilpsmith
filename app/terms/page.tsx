import type { Metadata } from "next";
import Link from "next/link";

import PageShell from "../../components/site/PageShell";
import { PageHeader, Prose } from "../../components/site/Prose";
import { SITE_LEGAL_NAME, SITE_URL, SUPPORT_EMAIL, BUSINESS_COUNTRY } from "../../lib/site";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `The terms and conditions governing the use of ${SITE_LEGAL_NAME} and purchases made through our store.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Legal"
        title="Terms & Conditions"
        intro={`These terms govern your use of ${SITE_LEGAL_NAME} and any purchase you make from us. By using our website or placing an order, you agree to these terms.`}
        showUpdated
      />
      <Prose>
        <h2>1. Who we are</h2>
        <p>
          This website ({SITE_URL}) is operated by {SITE_LEGAL_NAME} (&quot;we&quot;,
          &quot;us&quot;, &quot;our&quot;), a 3D-printing studio based in{" "}
          {BUSINESS_COUNTRY}. You can reach us any time via our{" "}
          <Link href="/contact">support page</Link>
          {SUPPORT_EMAIL ? (
            <>
              {" "}
              or at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </>
          ) : null}
          .
        </p>

        <h2>2. Eligibility</h2>
        <p>
          By placing an order you confirm that you are at least 18 years old, or
          are accessing the site under the supervision of a parent or legal
          guardian, and that the information you provide is accurate and
          complete.
        </p>

        <h2>3. Products and custom orders</h2>
        <p>
          We sell ready-to-buy and made-to-order 3D-printed products, including
          personalized and fully custom commissions. Because our products are
          handcrafted and printed on demand:
        </p>
        <ul>
          <li>
            Minor variations in color, texture, dimensions, and finish are
            inherent to 3D printing and are not considered defects.
          </li>
          <li>
            Product images are illustrative. Final appearance may vary slightly
            from what is shown on screen.
          </li>
          <li>
            Personalized and custom items are produced specifically for you based
            on the details you supply (spelling, colors, sizes). Please review
            these carefully before confirming — we are not responsible for errors
            in information you provide.
          </li>
        </ul>

        <h2>4. Pricing and payment</h2>
        <p>
          All prices are listed in Indian Rupees (₹) and are inclusive of
          applicable taxes unless stated otherwise. We may update prices,
          descriptions, and availability at any time without notice. Accepted
          payment methods may include online payment (where enabled), Cash on
          Delivery, and order confirmation over WhatsApp. We reserve the right to
          cancel or refuse any order, including where pricing or product
          information was published in error.
        </p>

        <h2>5. Order acceptance</h2>
        <p>
          Your order is an offer to purchase. A confirmation message or email
          acknowledges receipt but does not guarantee acceptance. An order is
          accepted once we begin processing it. If we cannot fulfil an order, we
          will notify you and refund any amount already paid.
        </p>

        <h2>6. Shipping, returns and refunds</h2>
        <p>
          Delivery timelines, shipping charges, cancellations, returns, and
          refunds are described in our{" "}
          <Link href="/shipping-returns">Shipping &amp; Returns policy</Link>,
          which forms part of these terms.
        </p>

        <h2>7. Discount codes</h2>
        <p>
          Discount codes are subject to their own validity dates, minimum order
          values, and usage limits. They cannot be exchanged for cash and may be
          withdrawn at any time.
        </p>

        <h2>8. Intellectual property</h2>
        <p>
          All content on this site — including designs, images, logos, and text —
          is owned by or licensed to {SITE_LEGAL_NAME} and is protected by
          applicable laws. You may not reproduce, resell, or commercially exploit
          our designs without written permission. When you submit content for a
          custom order, you confirm you have the right to use it and grant us
          permission to use it solely to fulfil your order.
        </p>

        <h2>8a. Smart NFC idols, darshan pages and third-party content</h2>
        <p>
          Our Smart NFC idols link to &quot;darshan&quot; pages that present
          devotional media — aarti and bhajan videos, scripture texts, and a
          daily panchang. This material is provided for personal, devotional use
          only and is sourced from third parties:
        </p>
        <ul>
          <li>
            Aarti and bhajan videos are <strong>embedded</strong> from
            third-party platforms (such as YouTube) using their official
            players. We do not host, copy, or claim ownership of these videos,
            and their availability is controlled by those platforms.
          </li>
          <li>
            Scripture texts are <strong>linked</strong> from external sources we
            believe to be in the public domain or otherwise free to share. We do
            not host these files and credit the source on each reader page.
          </li>
          <li>
            Panchang information is computed for general guidance and may differ
            from regional almanacs.
          </li>
        </ul>
        <p>
          If you believe any linked or embedded content infringes your rights,
          contact us via our <Link href="/contact">support page</Link>
          {SUPPORT_EMAIL ? (
            <>
              {" "}
              or at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </>
          ) : null}{" "}
          with the details, and we will review and, where appropriate, promptly
          remove or replace the item.
        </p>

        <h2>9. Acceptable use</h2>
        <p>
          You agree not to misuse the site, attempt to disrupt it, or place
          fraudulent orders. We may suspend access or cancel orders where we
          reasonably suspect misuse.
        </p>

        <h2>10. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, {SITE_LEGAL_NAME} is not liable
          for any indirect or consequential loss arising from the use of our
          products or website. Our total liability for any order is limited to
          the amount you paid for that order.
        </p>

        <h2>11. Governing law</h2>
        <p>
          These terms are governed by the laws of {BUSINESS_COUNTRY}, and any
          disputes are subject to the exclusive jurisdiction of the courts there.
        </p>

        <h2>12. Changes to these terms</h2>
        <p>
          We may update these terms from time to time. The version published on
          this page is the one that applies to your use of the site. Continued
          use after changes constitutes acceptance.
        </p>

        <h2>13. Contact</h2>
        <p>
          Questions about these terms? Reach us via our{" "}
          <Link href="/contact">support page</Link>
          {SUPPORT_EMAIL ? (
            <>
              {" "}
              or at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </>
          ) : null}
          .
        </p>
      </Prose>
    </PageShell>
  );
}
