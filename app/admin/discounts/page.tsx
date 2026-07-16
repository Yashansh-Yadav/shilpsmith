"use client";

import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

type Scope = "ALL" | "CATEGORY" | "PRODUCT";

interface Discount {
  id: number;
  code: string | null;
  name: string;
  description: string | null;
  type: "PERCENTAGE" | "FIXED";
  value: string | number;
  scope: Scope;
  categoryId: number | null;
  category: { id: number; name: string; slug: string } | null;
  products: { productId: number }[];
  minOrderValue: string | number | null;
  maxUses: number | null;
  usedCount: number;
  perUserLimit: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

interface CategoryOption {
  id: number;
  name: string;
}
interface ProductOption {
  id: number;
  name: string;
}

// "kind" is a UI-only distinction: an automatic discount is just a discount
// with no code. The server stores them in one table.
type Kind = "AUTOMATIC" | "CODE";

interface NewForm {
  kind: Kind;
  code: string;
  name: string;
  description: string;
  type: "PERCENTAGE" | "FIXED";
  value: string;
  scope: Scope;
  categoryId: string;
  productIds: number[];
  minOrderValue: string;
  maxUses: string;
  startsAt: string;
  expiresAt: string;
  active: boolean;
}

const EMPTY: NewForm = {
  kind: "CODE",
  code: "",
  name: "",
  description: "",
  type: "PERCENTAGE",
  value: "10",
  scope: "ALL",
  categoryId: "",
  productIds: [],
  minOrderValue: "",
  maxUses: "",
  startsAt: "",
  expiresAt: "",
  active: true,
};

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

const inputCls =
  "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none";

// A labelled field wrapper so every input has a visible label above it (not just
// a placeholder that disappears once you type) plus an optional hint below.
function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
      {hint && <span className="text-xs text-slate-400">{hint}</span>}
    </div>
  );
}

export default function DiscountsPage() {
  const [codes, setCodes] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<NewForm>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

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
    // Categories + products for the scope selectors.
    fetch("/api/categories")
      .then((r) => r.json())
      .then((b) => b?.success && setCategories(b.data))
      .catch(() => {});
    // /api/products caps `limit` at 60; asking for more returns a 400 and the
    // list silently stays empty. 60 covers the catalog comfortably today.
    fetch("/api/products?limit=60")
      .then((r) => r.json())
      .then((b) => {
        if (!b?.success) return;
        const list = Array.isArray(b.data) ? b.data : b.data.items ?? [];
        setProducts(list.map((p: { id: number; name: string }) => ({ id: p.id, name: p.name })));
      })
      .catch(() => {});
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      name: form.name,
      type: form.type,
      value: Number(form.value) || 0,
      scope: form.scope,
      active: form.active,
    };
    if (form.kind === "CODE") payload.code = form.code.toUpperCase();
    if (form.description) payload.description = form.description;
    if (form.scope === "CATEGORY" && form.categoryId) {
      payload.categoryId = Number(form.categoryId);
    }
    if (form.scope === "PRODUCT") payload.productIds = form.productIds;
    if (form.minOrderValue) payload.minOrderValue = Number(form.minOrderValue);
    if (form.maxUses) payload.maxUses = Number(form.maxUses);
    if (form.startsAt) payload.startsAt = new Date(form.startsAt).toISOString();
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
        d ? `${d.field ?? "field"}: ${d.message}` : body?.error?.message ?? "Create failed"
      );
      return;
    }
    toast.success(`Created ${body.data.name}`);
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
    setCodes((cur) => cur.map((x) => (x.id === d.id ? { ...x, active: !d.active } : x)));
  }

  async function remove(d: Discount) {
    if (!confirm(`Delete "${d.name}"?`)) return;
    const res = await fetch(`/api/admin/discounts/${d.id}`, { method: "DELETE" });
    const body = await res.json();
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Delete failed");
      return;
    }
    toast.success(body.message ?? "Deleted");
    load();
  }

  function scopeLabel(d: Discount): string {
    if (d.scope === "ALL") return "Everything";
    if (d.scope === "CATEGORY") return d.category ? `Category: ${d.category.name}` : "Category";
    return `${d.products.length} product(s)`;
  }

  return (
    <div className="space-y-6">
      <Toaster />

      <div>
        <h1 className="text-3xl font-bold">Discounts</h1>
        <p className="text-sm text-slate-500">
          Two kinds: <strong>automatic</strong> event discounts apply on their own (e.g. a
          festival sale), and <strong>codes</strong> the customer types (e.g. 3DFESTO). They
          don&apos;t stack — each order gets the single best one. Used discounts can&apos;t be
          hard-deleted; they&apos;re deactivated instead.
        </p>
      </div>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Create new
        </h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Discount kind" hint="Automatic applies on its own; a code must be typed.">
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as Kind })}
              className={inputCls}
            >
              <option value="CODE">Code (customer types it)</option>
              <option value="AUTOMATIC">Automatic (event / no code)</option>
            </select>
          </Field>

          {form.kind === "CODE" ? (
            <Field label="Code" hint="What the customer types at checkout.">
              <input
                required
                placeholder="e.g. 3DFESTO"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className={`${inputCls} font-mono`}
              />
            </Field>
          ) : (
            <div className="hidden md:block" />
          )}

          <Field label="Name" hint="Shown to the customer when this discount applies.">
            <input
              required
              placeholder="e.g. Diwali Festival Sale"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
            />
          </Field>

          <Field label="Discount type">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as NewForm["type"] })}
              className={inputCls}
            >
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed amount (₹)</option>
            </select>
          </Field>

          <Field
            label={form.type === "PERCENTAGE" ? "Percentage off" : "Amount off (₹)"}
          >
            <input
              required
              type="number"
              step="0.01"
              placeholder={form.type === "PERCENTAGE" ? "e.g. 15" : "e.g. 100"}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className={inputCls}
            />
          </Field>

          <Field label="Applies to">
            <select
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value as Scope })}
              className={inputCls}
            >
              <option value="ALL">Everything in the store</option>
              <option value="CATEGORY">A single category</option>
              <option value="PRODUCT">Specific products</option>
            </select>
          </Field>

          {form.scope === "CATEGORY" && (
            <Field label="Category">
              <select
                required
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className={inputCls}
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {form.scope === "PRODUCT" && (
            <Field
              label="Products"
              hint={
                products.length === 0
                  ? "Loading products…"
                  : "Ctrl/Cmd-click to select more than one."
              }
              className="md:col-span-2"
            >
              <select
                multiple
                size={Math.min(6, Math.max(3, products.length))}
                value={form.productIds.map(String)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    productIds: Array.from(e.target.selectedOptions, (o) => Number(o.value)),
                  })
                }
                className={inputCls}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Minimum order value (₹)" hint="Optional — leave blank for none.">
            <input
              type="number"
              placeholder="e.g. 500"
              value={form.minOrderValue}
              onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Maximum total uses" hint="Optional — blank means unlimited.">
            <input
              type="number"
              placeholder="e.g. 100"
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Starts on" hint="Optional — blank means active immediately.">
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Expires on" hint="Optional — blank means no end date.">
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              className={inputCls}
            />
          </Field>
          <Field label="Description" hint="Optional — internal note." className="md:col-span-2">
            <input
              placeholder="e.g. Diwali 2026 campaign"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputCls}
            />
          </Field>

          <div className="flex items-end">
          <button
            type="submit"
            disabled={submitting}
            className="h-[42px] rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Creating…" : "Create discount"}
          </button>
          </div>
        </form>
      </section>

      <section className="overflow-x-auto rounded-3xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Code</th>
              <th className="px-3 py-3">Discount</th>
              <th className="px-3 py-3">Applies to</th>
              <th className="px-3 py-3">Used / Max</th>
              <th className="px-3 py-3">Expires</th>
              <th className="px-3 py-3">Active</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && codes.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No discounts yet.
                </td>
              </tr>
            )}
            {!loading &&
              codes.map((d) => (
                <tr key={d.id} className="border-b border-slate-100">
                  <td className="px-3 py-3 font-medium">{d.name}</td>
                  <td className="px-3 py-3 font-mono">
                    {d.code ?? <span className="text-slate-400">auto</span>}
                  </td>
                  <td className="px-3 py-3">
                    {d.type === "PERCENTAGE"
                      ? `${Number(d.value)}% off`
                      : `${formatRupee(Number(d.value))} off`}
                  </td>
                  <td className="px-3 py-3 text-slate-500">{scopeLabel(d)}</td>
                  <td className="px-3 py-3 text-slate-500">
                    {d.usedCount} / {d.maxUses ?? "∞"}
                  </td>
                  <td className="px-3 py-3 text-slate-500">
                    {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString("en-IN") : "—"}
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