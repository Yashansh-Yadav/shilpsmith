"use client";

import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import toast from "react-hot-toast";

// Friendly labels for the customization keys produced by customizationToRecord.
const CUSTOMIZATION_LABELS: Record<string, string> = {
  text: "Engraving",
  color: "Color",
  notes: "Notes",
};

// localStorage key — lets us prefill the form with whatever the customer entered
// last time. There's no customer login on the storefront yet, so this is how we
// "remember" them; swap to a session prefill once customer accounts ship.
const CONTACT_KEY = "shilpsmith-contact";

interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

const EMPTY_CONTACT: ContactInfo = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

interface Props {
  open: boolean;
  onClose: () => void;
  productName: string;
  price: number;
  variantName?: string | null;
  customization?: Record<string, string>;
  whatsappNumber?: string;
}

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function loadContact(): ContactInfo {
  if (typeof window === "undefined") return EMPTY_CONTACT;
  try {
    const raw = window.localStorage.getItem(CONTACT_KEY);
    if (!raw) return EMPTY_CONTACT;
    return { ...EMPTY_CONTACT, ...JSON.parse(raw) };
  } catch {
    return EMPTY_CONTACT;
  }
}

function saveContact(info: ContactInfo) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONTACT_KEY, JSON.stringify(info));
  } catch {
    /* storage may be unavailable (private mode) — non-fatal */
  }
}

export default function WhatsAppOrderDialog({
  open,
  onClose,
  productName,
  price,
  variantName,
  customization,
  whatsappNumber,
}: Props) {
  const [form, setForm] = useState<ContactInfo>(EMPTY_CONTACT);
  const [error, setError] = useState<string | null>(null);

  // Prefill from the last saved details every time the dialog opens.
  useEffect(() => {
    if (open) {
      setForm(loadContact());
      setError(null);
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function set<K extends keyof ContactInfo>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function buildMessage(): string {
    const label = variantName ? `${productName} (${variantName})` : productName;
    const lines: string[] = [
      "🛍️ *New Order — ShilpSmith*",
      "",
      "*Product Details*",
      `• Item: ${label}`,
      `• Price: ${formatRupee(price)}`,
    ];

    if (customization && Object.keys(customization).length > 0) {
      lines.push("", "*Customization*");
      for (const [key, value] of Object.entries(customization)) {
        lines.push(`• ${CUSTOMIZATION_LABELS[key] ?? key}: ${value}`);
      }
    }

    lines.push("", "*Customer Details*", `• Name: ${form.name.trim()}`);
    if (form.email.trim()) lines.push(`• Email: ${form.email.trim()}`);
    if (form.phone.trim()) lines.push(`• Contact: ${form.phone.trim()}`);
    if (form.address.trim()) lines.push(`• Address: ${form.address.trim()}`);

    return lines.join("\n");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      setError("Please enter a valid email or leave it blank");
      return;
    }

    if (!whatsappNumber) {
      toast.error("WhatsApp ordering is not configured");
      return;
    }

    saveContact(form);

    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
      buildMessage()
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-4xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-slate-100 bg-brand-50/60 p-5 sm:p-6">
          <h3 className="pr-8 text-lg font-black tracking-tight text-slate-900">
            Order on WhatsApp
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Share a few details and we&apos;ll confirm your order on WhatsApp.
          </p>
          <div className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
            <span className="line-clamp-1 pr-3 text-sm font-semibold text-slate-800">
              {variantName ? `${productName} · ${variantName}` : productName}
            </span>
            <span className="shrink-0 text-sm font-black text-slate-900">
              {formatRupee(price)}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-5 sm:p-6">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">
              Your name <span className="text-red-500">*</span>
            </span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Priya Sharma"
              autoFocus
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">
              Email <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">
              Contact number{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="10-digit mobile number"
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-600">
              Delivery address{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="House / street, city, pincode"
              className="resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
            />
          </label>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button
            type="submit"
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-3.5 font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-brand-700"
          >
            <MessageCircle className="h-4 w-4" strokeWidth={2.25} />
            Continue on WhatsApp
          </button>
          <p className="text-center text-[11px] text-slate-400">
            Opens WhatsApp with your order details pre-filled.
          </p>
        </form>
      </div>
    </div>
  );
}
