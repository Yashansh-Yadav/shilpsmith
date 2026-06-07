"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

interface SettingsRow {
  id: number;
  key: string;
  value: Record<string, unknown> | unknown;
  updatedAt?: string;
}

type Section = {
  key: string;
  title: string;
  description: string;
  fields: {
    name: string;
    label: string;
    type?: "text" | "number" | "boolean";
    placeholder?: string;
    help?: string;
  }[];
};

const SECTIONS: Section[] = [
  {
    key: "payments",
    title: "Payments",
    description:
      "Control which payment methods customers can use at checkout.",
    fields: [
      {
        name: "onlineEnabled",
        label: "Enable online payments (Razorpay)",
        type: "boolean",
        help: "When off, checkout shows online payment as “Coming soon” and steers customers to WhatsApp / Cash on delivery.",
      },
    ],
  },
  {
    key: "company",
    title: "Company",
    description: "Public-facing business details (name, contact, address).",
    fields: [
      { name: "name", label: "Company name" },
      { name: "email", label: "Support email" },
      { name: "phone", label: "Contact phone" },
      { name: "address", label: "Business address" },
    ],
  },
  {
    key: "shipping",
    title: "Shipping",
    description:
      "Drives the totals at checkout (currently the cart/order route still hardcodes these — see CLAUDE.md).",
    fields: [
      { name: "flatRate", label: "Flat shipping fee (₹)", type: "number", placeholder: "50" },
      { name: "freeAbove", label: "Free shipping above (₹)", type: "number", placeholder: "1000" },
    ],
  },
  {
    key: "tax",
    title: "Tax (GST)",
    description: "Default GST rate applied at checkout.",
    fields: [
      { name: "ratePercent", label: "Rate (%)", type: "number", placeholder: "0" },
    ],
  },
  {
    key: "whatsapp",
    title: "WhatsApp",
    description: "Number shown in the Order on WhatsApp CTA.",
    fields: [
      { name: "number", label: "WhatsApp number (with country code)", placeholder: "919999999999" },
    ],
  },
  {
    key: "seo",
    title: "Site SEO",
    description: "Default metadata fallback (per-page overrides take precedence).",
    fields: [
      { name: "title", label: "Default title" },
      { name: "description", label: "Default description" },
      { name: "keywords", label: "Comma-separated keywords" },
    ],
  },
];

function asRecord(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    out[k] = val == null ? "" : String(val);
  }
  return out;
}

export default function SettingsPage() {
  const [rows, setRows] = useState<SettingsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/settings");
    const body = await res.json();
    setLoading(false);
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Failed to load settings");
      return;
    }
    setRows(body.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const byKey = useMemo(() => {
    const m = new Map<string, SettingsRow>();
    rows.forEach((r) => m.set(r.key, r));
    return m;
  }, [rows]);

  function valueFor(sectionKey: string): Record<string, string> {
    if (drafts[sectionKey]) return drafts[sectionKey];
    const row = byKey.get(sectionKey);
    return asRecord(row?.value);
  }

  function setField(sectionKey: string, field: string, value: string) {
    setDrafts((d) => ({
      ...d,
      [sectionKey]: { ...valueFor(sectionKey), [field]: value },
    }));
  }

  async function save(sectionKey: string) {
    setSavingKey(sectionKey);
    const value = valueFor(sectionKey);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: sectionKey, value }),
    });
    const body = await res.json();
    setSavingKey(null);
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Save failed");
      return;
    }
    toast.success("Saved");
    setDrafts((d) => {
      const next = { ...d };
      delete next[sectionKey];
      return next;
    });
    load();
  }

  return (
    <div className="space-y-6">
      <Toaster />

      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-sm text-slate-500">
          Persisted in the <code>Settings</code> table, keyed by section.
        </p>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map((section) => {
            const draft = drafts[section.key];
            const dirty = !!draft;
            const values = valueFor(section.key);
            return (
              <section
                key={section.key}
                className="rounded-3xl bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold">{section.title}</h2>
                    <p className="text-xs text-slate-500">{section.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => save(section.key)}
                    disabled={!dirty || savingKey === section.key}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {savingKey === section.key ? "Saving…" : `Save${dirty ? "*" : ""}`}
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {section.fields.map((f) => {
                    if (f.type === "boolean") {
                      const on = values[f.name] === "true";
                      return (
                        <div
                          key={f.name}
                          className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 md:col-span-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {f.label}
                            </p>
                            {f.help && (
                              <p className="mt-0.5 text-xs text-slate-500">
                                {f.help}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={on}
                            onClick={() =>
                              setField(
                                section.key,
                                f.name,
                                on ? "false" : "true"
                              )
                            }
                            className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                              on ? "bg-brand-600" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                                on ? "translate-x-5" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      );
                    }
                    return (
                      <label key={f.name} className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-slate-500">{f.label}</span>
                        <input
                          type={f.type ?? "text"}
                          value={values[f.name] ?? ""}
                          placeholder={f.placeholder}
                          onChange={(e) => setField(section.key, f.name, e.target.value)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        />
                      </label>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
