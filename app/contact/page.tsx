import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { Mail, MessageCircle, Clock } from "lucide-react";

import PageShell from "../../components/site/PageShell";
import { PageHeader } from "../../components/site/Prose";
import SupportForm from "../../components/site/SupportForm";
import {
  SITE_LEGAL_NAME,
  SUPPORT_EMAIL,
  whatsappLink,
} from "../../lib/site";

export const metadata: Metadata = {
  title: "Support & Contact",
  description: `Get help with an order or raise a concern with ${SITE_LEGAL_NAME}. Reach us by email, WhatsApp, or our support form.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const waLink = whatsappLink("Hi! I need help with ShilpSmith.");

  return (
    <PageShell>
      <Toaster />
      <PageHeader
        eyebrow="We're here to help"
        title="Support & Contact"
        intro="Have a question, an issue with an order, or an idea for a custom piece? Raise a concern below and our team will get back to you — usually within one business day."
      />

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          {/* Contact channels */}
          <div className="space-y-4">
            {SUPPORT_EMAIL && (
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex items-start gap-3 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-slate-200"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <Mail className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-900">
                    Email us
                  </span>
                  <span className="block text-sm text-slate-500">
                    {SUPPORT_EMAIL}
                  </span>
                </span>
              </a>
            )}

            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition hover:border-slate-200"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <MessageCircle className="h-5 w-5" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-slate-900">
                    Chat on WhatsApp
                  </span>
                  <span className="block text-sm text-slate-500">
                    Fastest for order updates
                  </span>
                </span>
              </a>
            )}

            <div className="flex items-start gap-3 rounded-3xl border border-slate-100 bg-slate-50/60 p-5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-600 ring-1 ring-slate-100">
                <Clock className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-bold text-slate-900">
                  Response time
                </span>
                <span className="block text-sm text-slate-500">
                  Within 1 business day, Mon–Sat.
                </span>
              </span>
            </div>
          </div>

          {/* Concern form */}
          <div>
            <h2 className="mb-4 text-lg font-bold tracking-tight text-slate-900">
              Raise a concern
            </h2>
            <SupportForm />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
