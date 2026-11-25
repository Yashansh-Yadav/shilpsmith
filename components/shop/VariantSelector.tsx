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
      <label className="mb-3 block font-mono text-xs uppercase tracking-[0.18em] text-slate-500">Variant</label>
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
              className={`rounded-2xl p-4 text-left transition active:scale-[.98] ${
                selected
                  ? "bg-slate-900 text-white ring-2 ring-slate-900"
                  : "bg-white ring-1 ring-slate-200 hover:ring-slate-400"
              } ${outOfStock ? "cursor-not-allowed opacity-50" : ""}`}
            >
              <div className="font-display font-semibold tracking-tight">{v.name}</div>
              <div className={`mt-1 font-mono text-xs ${selected ? "text-slate-300" : "text-slate-500"}`}>
                {formatRupee(total)}
                {modifier !== 0 && (
                  <span className="ml-1 opacity-70">
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
