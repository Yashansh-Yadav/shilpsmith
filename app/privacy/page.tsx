import type { Metadata } from "next";
import Link from "next/link";

import PageShell from "../../components/site/PageShell";
import { PageHeader, Prose } from "../../components/site/Prose";
import { SITE_LEGAL_NAME, SUPPORT_EMAIL, BUSINESS_COUNTRY } from "../../lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE_LEGAL_NAME} collects, uses, and protects your personal information.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        intro={`${SITE_LEGAL_NAME} respects your privacy. This policy explains what information we collect, why, and the choices you have.`}
        showUpdated
      />
      <Prose>
        <h2>1. Information we collect</h2>
        <p>We collect information you give us and information collected automatically.</p>
        <h3>Information you provide</h3>
        <ul>
          <li>
            <strong>Order &amp; contact details:</strong> name, email address,
            phone number, and shipping/billing address when you place an order or
            contact support.
          </li>
          <li>
            <strong>Custom order content:</strong> personalization text, images,
            or references you share for a commission.
          </li>
          <li>
            <strong>Reviews &amp; messages:</strong> content you submit through
            reviews or our support form.
          </li>
        </ul>
        <h3>Information collected automatically</h3>
        <ul>
          <li>
            Basic technical data such as device/browser type and pages visited,
            used to keep the site secure and improve it.
          </li>
          <li>
            Local storage on your device to remember your cart and previously
            entered contact details for convenience.
          </li>
        </ul>

        <h2>2. How we use your information</h2>
        <ul>
          <li>To process, fulfil, and deliver your orders.</li>
          <li>To provide customer support and respond to your enquiries.</li>
          <li>To send order confirmations and important service messages.</li>
          <li>To prevent fraud and keep our store and customers safe.</li>
          <li>To improve our products, website, and service.</li>
        </ul>

        <h2>3. Payment information</h2>
        <p>
          Online payments are handled by our third-party payment provider. We do
          not store your full card or banking details on our servers — that
          information is processed securely by the payment provider under their
          own privacy and security standards.
        </p>

        <h2>4. Sharing your information</h2>
        <p>
          We do not sell your personal information. We share it only with service
          providers who help us run the business — for example payment
          processors, email delivery, shipping/courier partners, and hosting —
          and only to the extent needed to perform those services, or where
          required by law.
        </p>

        <h2>5. Cookies and local storage</h2>
        <p>
          We use essential local storage to operate the cart and remember your
          details for faster checkout. We do not require non-essential tracking
          for the core shopping experience. You can clear this data from your
          browser at any time.
        </p>

        <h2>6. Data retention</h2>
        <p>
          We keep order and contact information for as long as needed to fulfil
          orders, provide support, and meet legal, tax, and accounting
          obligations, after which it is deleted or anonymized.
        </p>

        <h2>7. Your rights</h2>
        <p>
          You may request access to, correction of, or deletion of your personal
          information, subject to legal requirements. To make a request, contact
          us via our <Link href="/contact">support page</Link>
          {SUPPORT_EMAIL ? (
            <>
              {" "}
              or at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </>
          ) : null}
          .
        </p>

        <h2>8. Children&apos;s privacy</h2>
        <p>
          Our store is intended for adults. We do not knowingly collect personal
          information from children without parental consent.
        </p>

        <h2>9. Security</h2>
        <p>
          We take reasonable technical and organizational measures to protect
          your information. However, no method of transmission or storage is
          completely secure, and we cannot guarantee absolute security.
        </p>

        <h2>10. Changes to this policy</h2>
        <p>
          We may update this policy from time to time. The current version is
          always available on this page.
        </p>

        <h2>11. Contact</h2>
        <p>
          For any privacy question or request, contact us via our{" "}
          <Link href="/contact">support page</Link>
          {SUPPORT_EMAIL ? (
            <>
              {" "}
              or at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </>
          ) : null}
          . {SITE_LEGAL_NAME} is based in {BUSINESS_COUNTRY}.
        </p>
      </Prose>
    </PageShell>
  );
}
