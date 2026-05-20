"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Variant {
  id: number;
  name: string;
  sku: string | null;
  priceModifier: string | number;
  stock: number;
  attributes: Record<string, unknown> | null;
}

interface NewVariantForm {
  name: string;
  sku: string;
  priceModifier: string;
  stock: string;
  attributes: string;
}

const EMPTY_FORM: NewVariantForm = {
  name: "",
  sku: "",
  priceModifier: "0",
  stock: "0",
  attributes: "",
};

interface Props {
  productId: number;
}

export default function VariantsPanel({ productId }: Props) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<NewVariantForm>(EMPTY_FORM);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/products/${productId}/variants`);
    const body = await res.json();
    setLoading(false);
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Failed to load variants");
      return;
    }
    setVariants(body.data);
  }, [productId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function parseAttributes(raw: string): Record<string, unknown> | undefined {
    if (!raw.trim()) return undefined;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      throw new Error();
    } catch {
      toast.error("Attributes must be valid JSON object");
      throw new Error("invalid-attributes");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    let attributes: Record<string, unknown> | undefined;
    try {
      attributes = parseAttributes(form.attributes);
    } catch {
      return;
    }

    const payload = {
      name: form.name,
      sku: form.sku || undefined,
      priceModifier: Number(form.priceModifier) || 0,
      stock: Number(form.stock) || 0,
      ...(attributes ? { attributes } : {}),
    };
    setLoading(true);
    const res = await fetch(`/api/admin/products/${productId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok || !body.success) {
      const d = body?.error?.details?.[0];
      toast.error(
        d
          ? `${d.field ?? "field"}: ${d.message}`
          : body?.error?.message ?? "Failed to create variant"
      );
      return;
    }
    toast.success("Variant created");
    setForm(EMPTY_FORM);
    refresh();
  }

  async function handleUpdate(v: Variant, patch: Partial<Variant>) {
    const payload: Record<string, unknown> = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.sku !== undefined) payload.sku = patch.sku;
    if (patch.priceModifier !== undefined) {
      payload.priceModifier = Number(patch.priceModifier) || 0;
    }
    if (patch.stock !== undefined) payload.stock = Number(patch.stock) || 0;

    const res = await fetch(`/api/admin/variants/${v.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Update failed");
      return;
    }
    setVariants((current) =>
      current.map((x) => (x.id === v.id ? { ...x, ...patch } : x))
    );
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this variant?")) return;
    const res = await fetch(`/api/admin/variants/${id}`, { method: "DELETE" });
    const body = await res.json();
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Delete failed");
      return;
    }
    toast.success("Variant deleted");
    setVariants((current) => current.filter((v) => v.id !== id));
  }

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Variants</h3>
          <p className="text-xs text-slate-500">
            Optional size/color/material options with their own price + stock.
          </p>
        </div>
      </div>

      {variants.length > 0 && (
        <div className="mb-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <Th>Name</Th>
                <Th>SKU</Th>
                <Th>Price modifier</Th>
                <Th>Stock</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3">
                    <InlineEdit
                      value={v.name}
                      onCommit={(val) => handleUpdate(v, { name: val })}
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <InlineEdit
                      value={v.sku ?? ""}
                      onCommit={(val) =>
                        handleUpdate(v, { sku: val || null })
                      }
                      placeholder="—"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <InlineEdit
                      type="number"
                      value={String(v.priceModifier)}
                      onCommit={(val) =>
                        handleUpdate(v, { priceModifier: val })
                      }
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <InlineEdit
                      type="number"
                      value={String(v.stock)}
                      onCommit={(val) => handleUpdate(v, { stock: Number(val) })}
                    />
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(v.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="grid grid-cols-1 gap-3 sm:grid-cols-5"
      >
        <input
          type="text"
          required
          placeholder="Name (e.g. Large)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-xl border border-slate-200 px-3 py-2 sm:col-span-2"
        />
        <input
          type="text"
          placeholder="SKU (optional)"
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
          className="rounded-xl border border-slate-200 px-3 py-2"
        />
        <input
          type="number"
          step="0.01"
          placeholder="Price +/-"
          value={form.priceModifier}
          onChange={(e) =>
            setForm({ ...form, priceModifier: e.target.value })
          }
          className="rounded-xl border border-slate-200 px-3 py-2"
        />
        <input
          type="number"
          placeholder="Stock"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
          className="rounded-xl border border-slate-200 px-3 py-2"
        />
        <input
          type="text"
          placeholder='Attributes JSON, e.g. {"size":"M"}'
          value={form.attributes}
          onChange={(e) =>
            setForm({ ...form, attributes: e.target.value })
          }
          className="rounded-xl border border-slate-200 px-3 py-2 sm:col-span-4"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Add variant
        </button>
      </form>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="py-2 pr-3 text-xs uppercase text-slate-500">{children}</th>;
}

function InlineEdit({
  value,
  onCommit,
  placeholder,
  type = "text",
}: {
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number";
}) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  return (
    <input
      type={type}
      value={local}
      placeholder={placeholder}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => {
        if (local !== value) onCommit(local);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setLocal(value);
      }}
      className="w-full rounded-lg border border-transparent px-2 py-1 hover:border-slate-200 focus:border-slate-400 focus:outline-none"
    />
  );
}
