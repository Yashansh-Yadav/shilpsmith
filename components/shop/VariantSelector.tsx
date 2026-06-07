"use client";

export interface VariantSummary {
  id: number;
  name: string;
  sku?: string | null;
  priceModifier: number | string | { toString(): string };
  stock: number;
  attributes?: Record<string, unknown> | null;
}

interface Props {
  variants: VariantSummary[];
  selectedId: number | null;
  onChange: (id: number | null) => void;
  basePrice: number;
}

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function VariantSelector({
  variants,
  selectedId,
  onChange,
  basePrice,
}: Props) {
  if (variants.length === 0) return null;

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold">Variant</label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {variants.map((v) => {
          const modifier = Number(v.priceModifier ?? 0);
          const total = basePrice + modifier;
          const outOfStock = v.stock === 0;
          const selected = selectedId === v.id;
          return (
            <button
              key={v.id}
              type="button"
              disabled={outOfStock}
              onClick={() => onChange(selected ? null : v.id)}
              className={`rounded-2xl border p-3 text-left transition ${
                selected
                  ? "border-black bg-slate-50"
                  : "border-slate-200 hover:border-slate-400"
              } ${outOfStock ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="text-sm font-semibold">{v.name}</div>
              <div className="text-xs text-slate-500">
                {formatRupee(total)}
                {modifier !== 0 && (
                  <span className="ml-1 text-slate-400">
                    ({modifier > 0 ? "+" : ""}
                    {formatRupee(modifier)})
                  </span>
                )}
              </div>
              {outOfStock ? (
                <div className="mt-1 text-xs text-red-600">Out of stock</div>
              ) : v.stock > 0 && v.stock <= 5 ? (
                <div className="mt-1 text-xs text-amber-600">
                  Only {v.stock} left
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
