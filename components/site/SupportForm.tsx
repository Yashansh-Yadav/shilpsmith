"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, Send } from "lucide-react";

// Mirrors SUPPORT_CATEGORIES in lib/validators.ts, with display labels.
const CATEGORIES: { value: string; label: string }[] = [
  { value: "order", label: "An existing order" },
  { value: "product", label: "A product question" },
  { value: "custom", label: "Custom order / commission" },
  { value: "shipping", label: "Shipping or delivery" },
  { value: "payment", label: "Payment or refund" },
  { value: "other", label: "Something else" },
];

// Remembers a returning customer's contact details across the storefront
// (prefill on the next visit). Same key the checkout/contact flows reuse.
const CONTACT_KEY = "shilpsmith-contact";

interface FormState {
  name: string;
  email: string;
  phone: string;
  category: string;
  orderNumber: string;
  message: string;
}

const EMPTY: FormState = {
  name: "",
  email: "",
  phone: "",
  category: "order",
  orderNumber: "",
  message: "",
};

export default function SupportForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Prefill name / email / phone from the saved contact details.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CONTACT_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      setForm((f) => ({
        ...f,
        name: saved.name ?? f.name,
        email: saved.email ?? f.email,
        phone: saved.phone ?? f.phone,
      }));
    } catch {
      /* ignore */
    }
  }, []);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        category: form.category,
        ...(form.orderNumber.trim()
          ? { orderNumber: form.orderNumber.trim() }
          : {}),
        message: form.message,
      }),
    });
    const body = await res.json();
    setSubmitting(false);

    if (!res.ok || !body.success) {
      const detail = body?.error?.details?.[0];
      toast.error(
        detail
          ? `${detail.field ?? "field"}: ${detail.message}`
          : body?.error?.message ?? "Could not send your request"
      );
      return;
    }

    // Remember contact details for next time.
    try {
      window.localStorage.setItem(
        CONTACT_KEY,
        JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: "",
        })
      );
    } catch {
      /* ignore */
    }

    setDone(true);
    toast.success("Request sent");
  }

  if (done) {
    return (
      <div className="rounded-3xl border border-brand-200 bg-brand-50/60 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-brand-600" />
        <h3 className="mt-3 text-lg font-bold text-slate-900">
          Thanks — we&apos;ve got it!
        </h3>
        <p className="mt-1 text-sm text-slate-600">
          Our team will get back to you at{" "}
          <span className="font-medium">{form.email}</span> as soon as possible.
        </p>
        <button
          type="button"
          onClick={() => {
            setForm((f) => ({ ...EMPTY, name: f.name, email: f.email, phone: f.phone }));
            setDone(false);
          }}
          className="mt-5 text-sm font-semibold text-brand-700 hover:underline"
        >
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">
            Name <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">
            Email <span className="text-red-500">*</span>
          </span>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">
            Phone <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-slate-600">
            This is about <span className="text-red-500">*</span>
          </span>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-semibold text-slate-600">
            Order number{" "}
            <span className="font-normal text-slate-400">(if applicable)</span>
          </span>
          <input
            type="text"
            value={form.orderNumber}
            onChange={(e) => set("orderNumber", e.target.value)}
            placeholder="ORD-XXXXXXXX-XXXXX"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-mono outline-none focus:border-brand-500"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs font-semibold text-slate-600">
            How can we help? <span className="text-red-500">*</span>
          </span>
          <textarea
            required
            rows={5}
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            placeholder="Tell us what's going on…"
            className="resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 font-semibold text-white shadow-cta transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
      >
        <Send className="h-4 w-4" strokeWidth={2.25} />
        {submitting ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
