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
      <div className="rounded-[1.75rem] bg-brand-50 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-brand-600" />
        <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-slate-900">
          Thanks — we&apos;ve got it!
        </h3>
        <p className="mt-2 text-slate-600">
          Our team will get back to you at{" "}
          <span className="font-medium">{form.email}</span> as soon as possible.
        </p>
        <button
          type="button"
          onClick={() => {
            setForm((f) => ({ ...EMPTY, name: f.name, email: f.email, phone: f.phone }));
            setDone(false);
          }}
          className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:ring-slate-400"
        >
          Send another request
        </button>
      </div>
    );
  }

  return (
    // No card of its own — the page places it inside its panel.
    <form onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-800">
            Name <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="rounded-2xl bg-white px-4 py-3.5 text-[15px] text-slate-900 ring-1 ring-slate-200 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-800">
            Email <span className="text-red-500">*</span>
          </span>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
            className="rounded-2xl bg-white px-4 py-3.5 text-[15px] text-slate-900 ring-1 ring-slate-200 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-800">
            Phone <span className="font-normal text-slate-400">(optional)</span>
          </span>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            className="rounded-2xl bg-white px-4 py-3.5 text-[15px] text-slate-900 ring-1 ring-slate-200 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-slate-800">
            This is about <span className="text-red-500">*</span>
          </span>
          <select
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className="rounded-2xl bg-white px-4 py-3.5 text-[15px] text-slate-900 ring-1 ring-slate-200 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-sm font-semibold text-slate-800">
            Order number{" "}
            <span className="font-normal text-slate-400">(if applicable)</span>
          </span>
          <input
            type="text"
            value={form.orderNumber}
            onChange={(e) => set("orderNumber", e.target.value)}
            placeholder="ORD-XXXXXXXX-XXXXX"
            className="rounded-2xl bg-white px-4 py-3.5 text-[15px] text-slate-900 ring-1 ring-slate-200 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 font-mono"
          />
        </label>
        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-sm font-semibold text-slate-800">
            How can we help? <span className="text-red-500">*</span>
          </span>
          <textarea
            required
            rows={5}
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            placeholder="Tell us what's going on…"
            className="resize-none rounded-2xl bg-white px-4 py-3.5 text-[15px] text-slate-900 ring-1 ring-slate-200 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-7 py-4 font-semibold text-slate-950 transition hover:brightness-110 active:scale-[.97] disabled:opacity-50 disabled:active:scale-100"
      >
        <Send className="h-4 w-4" strokeWidth={2.25} />
        {submitting ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
