"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import ProductImage from "../../../components/shop/ProductImage";

interface InventoryProduct {
  id: number;
  name: string;
  slug: string;
  stock: number;
  stockStatus: string;
  lowStockThreshold: number;
  price: string;
  images: { url: string }[];
  variants: { id: number; name: string; sku: string | null; stock: number }[];
}

interface ProductDraft {
  stock?: number;
  lowStockThreshold?: number;
}

interface VariantDraft {
  stock?: number;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [productDrafts, setProductDrafts] = useState<Record<number, ProductDraft>>({});
  const [variantDrafts, setVariantDrafts] = useState<Record<number, VariantDraft>>({});
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/inventory");
    const body = await res.json();
    setLoading(false);
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Failed to load inventory");
      return;
    }
    setItems(body.data);
    setProductDrafts({});
    setVariantDrafts({});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((p) => {
      if (filter === "out") return p.stockStatus === "out-of-stock" || p.stock === 0;
      return (
        p.stock > 0 && p.stock <= p.lowStockThreshold
      );
    });
  }, [items, filter]);

  const dirty =
    Object.keys(productDrafts).length > 0 || Object.keys(variantDrafts).length > 0;

  function setProductField(id: number, field: keyof ProductDraft, value: number) {
    setProductDrafts((d) => ({
      ...d,
      [id]: { ...d[id], [field]: value },
    }));
  }

  function setVariantField(id: number, value: number) {
    setVariantDrafts((d) => ({ ...d, [id]: { stock: value } }));
  }

  async function save() {
    if (!dirty) return;
    setSaving(true);
    const payload: {
      products?: { id: number; stock?: number; lowStockThreshold?: number }[];
      variants?: { id: number; stock: number }[];
    } = {};
    const products = Object.entries(productDrafts)
      .filter(([, v]) => v.stock !== undefined || v.lowStockThreshold !== undefined)
      .map(([id, v]) => ({
        id: Number(id),
        ...(v.stock !== undefined ? { stock: v.stock } : {}),
        ...(v.lowStockThreshold !== undefined
          ? { lowStockThreshold: v.lowStockThreshold }
          : {}),
      }));
    const variants = Object.entries(variantDrafts)
      .filter(([, v]) => v.stock !== undefined)
      .map(([id, v]) => ({ id: Number(id), stock: v.stock as number }));
    if (products.length) payload.products = products;
    if (variants.length) payload.variants = variants;

    const res = await fetch("/api/admin/inventory", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    setSaving(false);
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Save failed");
      return;
    }
    toast.success("Inventory saved");
    load();
  }

  return (
    <div className="space-y-6">
      <Toaster />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="text-sm text-slate-500">
            Track product + variant stock. Threshold drives "low stock" badge.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All products</option>
            <option value="low">Low stock only</option>
            <option value="out">Out of stock</option>
          </select>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : `Save changes${dirty ? "*" : ""}`}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-slate-500">No products match this filter.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((p) => {
            const draftStock = productDrafts[p.id]?.stock ?? p.stock;
            const draftThreshold =
              productDrafts[p.id]?.lowStockThreshold ?? p.lowStockThreshold;
            const isLow = draftStock > 0 && draftStock <= draftThreshold;
            const isOut = draftStock === 0 || p.stockStatus === "out-of-stock";
            return (
              <div
                key={p.id}
                className="rounded-3xl bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start gap-4">
                  <div className="h-16 w-16 flex-none overflow-hidden rounded-2xl">
                    <ProductImage
                      src={p.images?.[0]?.url}
                      alt={p.name}
                      productId={p.id}
                      aspectClass="h-full w-full"
                      variant="mini"
                    />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-slate-500">{p.slug}</p>
                    <div className="mt-1 flex gap-2">
                      {isOut && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Out of stock
                        </span>
                      )}
                      {!isOut && isLow && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Low stock
                        </span>
                      )}
                    </div>
                  </div>

                  <label className="text-xs">
                    <span className="block font-medium text-slate-500">Stock</span>
                    <input
                      type="number"
                      min={0}
                      value={draftStock}
                      onChange={(e) =>
                        setProductField(p.id, "stock", Math.max(0, Number(e.target.value)))
                      }
                      className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="text-xs">
                    <span className="block font-medium text-slate-500">Low threshold</span>
                    <input
                      type="number"
                      min={0}
                      value={draftThreshold}
                      onChange={(e) =>
                        setProductField(
                          p.id,
                          "lowStockThreshold",
                          Math.max(0, Number(e.target.value))
                        )
                      }
                      className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                </div>

                {p.variants.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-slate-100 p-3">
                    <h3 className="mb-2 text-xs font-semibold uppercase text-slate-500">
                      Variants
                    </h3>
                    <table className="w-full text-sm">
                      <tbody>
                        {p.variants.map((v) => {
                          const draft = variantDrafts[v.id]?.stock ?? v.stock;
                          return (
                            <tr key={v.id}>
                              <td className="py-1 pr-3">{v.name}</td>
                              <td className="py-1 pr-3 text-xs text-slate-500">
                                {v.sku ?? "—"}
                              </td>
                              <td className="py-1 pr-3">
                                <input
                                  type="number"
                                  min={0}
                                  value={draft}
                                  onChange={(e) =>
                                    setVariantField(
                                      v.id,
                                      Math.max(0, Number(e.target.value))
                                    )
                                  }
                                  className="w-24 rounded-xl border border-slate-200 px-3 py-1 text-sm"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
