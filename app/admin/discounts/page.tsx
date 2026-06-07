"use client";

import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

interface Discount {
  id: number;
  code: string;
  description: string | null;
  type: "PERCENTAGE" | "FIXED";
  value: string | number;
  minOrderValue: string | number | null;
  maxUses: number | null;
  usedCount: number;
  perUserLimit: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

interface NewForm {
  code: string;
  description: string;
  type: "PERCENTAGE" | "FIXED";
  value: string;
  minOrderValue: string;
  maxUses: string;
  expiresAt: string;
  active: boolean;
}

const EMPTY: NewForm = {
  code: "",
  description: "",
  type: "PERCENTAGE",
  value: "10",
  minOrderValue: "",
  maxUses: "",
  expiresAt: "",
  active: true,
};

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function DiscountsPage() {
  const [codes, setCodes] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<NewForm>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/discounts");
    const body = await res.json();
    setLoading(false);
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Failed to load discounts");
      return;
    }
    setCodes(body.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      code: form.code.toUpperCase(),
      type: form.type,
      value: Number(form.value) || 0,
      active: form.active,
    };
    if (form.description) payload.description = form.description;
    if (form.minOrderValue) payload.minOrderValue = Number(form.minOrderValue);
    if (form.maxUses) payload.maxUses = Number(form.maxUses);
    if (form.expiresAt) payload.expiresAt = new Date(form.expiresAt).toISOString();

    const res = await fetch("/api/admin/discounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    setSubmitting(false);
    if (!res.ok || !body.success) {
      const d = body?.error?.details?.[0];
      toast.error(
        d
          ? `${d.field ?? "field"}: ${d.message}`
          : body?.error?.message ?? "Create failed"
      );
      return;
    }
    toast.success(`Created ${body.data.code}`);
    setForm(EMPTY);
    load();
  }

  async function toggleActive(d: Discount) {
    const res = await fetch(`/api/admin/discounts/${d.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !d.active }),
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Update failed");
      return;
    }
    setCodes((cur) =>
      cur.map((x) => (x.id === d.id ? { ...x, active: !d.active } : x))
    );
  }

  async function remove(d: Discount) {
    if (!confirm(`Delete code ${d.code}?`)) return;
    const res = await fetch(`/api/admin/discounts/${d.id}`, { method: "DELETE" });
    const body = await res.json();
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Delete failed");
      return;
    }
    toast.success(body.message ?? "Deleted");
    load();
  }

  return (
    <div className="space-y-6">
      <Toaster />

      <div>
        <h1 className="text-3xl font-bold">Discount codes</h1>
        <p className="text-sm text-slate-500">
          Applied at checkout. Codes that have been used can&apos;t be hard-deleted —
          they get deactivated instead.
        </p>
      </div>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Create new
        </h2>
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
        >
          <input
            required
            placeholder="CODE (e.g. WELCOME10)"
            value={form.code}
            onChange={(e) =>
              setForm({ ...form, code: e.target.value.toUpperCase() })
            }
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
          />
          <select
            value={form.type}
            onChange={(e) =>
              setForm({
                ...form,
                type: e.target.value as NewForm["type"],
              })
            }
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed amount</option>
          </select>
          <input
            required
            type="number"
            step="0.01"
            placeholder={form.type === "PERCENTAGE" ? "% off" : "₹ off"}
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Min order ₹ (optional)"
            value={form.minOrderValue}
            onChange={(e) =>
              setForm({ ...form, minOrderValue: e.target.value })
            }
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Max uses (optional)"
            value={form.maxUses}
            onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="datetime-local"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create code"}
          </button>
        </form>
      </section>

      <section className="overflow-x-auto rounded-3xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <th className="px-3 py-3">Code</th>
              <th className="px-3 py-3">Discount</th>
              <th className="px-3 py-3">Min order</th>
              <th className="px-3 py-3">Used / Max</th>
              <th className="px-3 py-3">Expires</th>
              <th className="px-3 py-3">Active</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && codes.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No discount codes yet.
                </td>
              </tr>
            )}
            {!loading &&
              codes.map((d) => (
                <tr key={d.id} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-mono">{d.code}</td>
                  <td className="px-3 py-3">
                    {d.type === "PERCENTAGE"
                      ? `${Number(d.value)}% off`
                      : `${formatRupee(Number(d.value))} off`}
                  </td>
                  <td className="px-3 py-3 text-slate-500">
                    {d.minOrderValue != null
                      ? formatRupee(Number(d.minOrderValue))
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-slate-500">
                    {d.usedCount} / {d.maxUses ?? "∞"}
                  </td>
                  <td className="px-3 py-3 text-slate-500">
                    {d.expiresAt
                      ? new Date(d.expiresAt).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(d)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        d.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {d.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(d)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
