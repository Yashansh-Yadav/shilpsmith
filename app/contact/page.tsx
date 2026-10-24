import type { Metadata } from "next";

import PageShell from "../../components/site/PageShell";
import { PageHeader } from "../../components/site/Prose";
import SupportForm from "../../components/site/SupportForm";
import {
  SITE_LEGAL_NAME,
  SUPPORT_EMAIL,
  BUSINESS_PHONE,
  BUSINESS_PHONE_E164,
  BUSINESS_ADDRESS_LINE,
  whatsappLink,
} from "../../lib/site";

export const metadata: Metadata = {
  title: "Support & Contact",
  description: `Get help with an order or raise a concern with ${SITE_LEGAL_NAME}. Reach us by email, WhatsApp, or our support form.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const waLink = whatsappLink("Hi! I need help with ShilpSmith.");

  const channel =
    "group block rounded-[1.75rem] bg-white p-6 ring-1 ring-slate-200/70 transition hover:ring-brand-400";
  const label = "font-mono text-xs uppercase tracking-[0.18em] text-slate-500";

  // The toast host lives in PageShell — SupportForm's toasts render there.
  return (
    <PageShell>
      <PageHeader
        eyebrow="We're here to help"
        title="Support & Contact"
        intro="Have a question, an issue with an order, or an idea for a custom piece? Raise a concern below and our team will get back to you — usually within one business day."
      />

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[2fr_3fr] lg:gap-16">
          {/* Contact channels */}
          <div>
            <h2 className="font-display text-4xl font-semibold tracking-[-0.035em] text-slate-900 sm:text-5xl">
              Talk to a human
            </h2>
            <div className="mt-8 space-y-3">
              {waLink && (
                <a href={waLink} target="_blank" rel="noreferrer" className={channel}>
                  <p className={label}>Chat on WhatsApp</p>
                  <p className="mt-2 font-display text-xl font-semibold tracking-tight text-slate-900 group-hover:text-brand-700">
                    Fastest for order updates →
                  </p>
                </a>
              )}

              {SUPPORT_EMAIL && (
                <a href={`mailto:${SUPPORT_EMAIL}`} className={channel}>
                  <p className={label}>Email us</p>
                  <p className="mt-2 font-display text-xl font-semibold tracking-tight text-slate-900 group-hover:text-brand-700">
                    {SUPPORT_EMAIL}
                  </p>
                </a>
              )}

              <a href={`tel:${BUSINESS_PHONE_E164}`} className={channel}>
                <p className={label}>Call us</p>
                <p className="mt-2 font-mono text-xl font-semibold text-slate-900 group-hover:text-brand-700">
                  {BUSINESS_PHONE}
                </p>
              </a>

              {/* Displayed business address — India's e-commerce rules expect a
                  geographic address on the site, and it's a trust signal for
                  customers and search engines alike. */}
              <div className="rounded-[1.75rem] bg-white p-6 ring-1 ring-slate-200/70">
                <p className={label}>Studio address</p>
                <address className="mt-2 not-italic text-lg font-semibold leading-snug text-slate-900">
                  {SITE_LEGAL_NAME}
                  <br />
                  <span className="font-normal text-slate-600">{BUSINESS_ADDRESS_LINE}</span>
                </address>
              </div>

              <div className="rounded-[1.75rem] bg-slate-950 p-6 text-white">
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-300">
                  Response time
                </p>
                <p className="mt-2 text-lg font-semibold">
                  Within 1 business day, Mon–Sat.
                </p>
              </div>
            </div>
          </div>

          {/* Concern form */}
          <div className="rounded-[2rem] bg-white p-6 ring-1 ring-slate-200/70 sm:p-10">
            <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-slate-900">
              Raise a concern
            </h2>
            <p className="mt-2 text-slate-600">
              Tell us what happened and how to reach you.
            </p>
            <div className="mt-8">
              <SupportForm />
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
