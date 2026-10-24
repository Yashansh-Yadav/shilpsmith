// Discount tag for the top-left corner of a product image — the same emerald
// mono pill the storefront cards use (ProductCard / HomeProductCard). Purely
// presentational; the parent must be `relative`.

export default function DiscountRibbon({ percent }: { percent: number }) {
  return (
    <span
      className="absolute left-3 top-3 z-10 rounded-full bg-brand-500 px-2.5 py-1 font-mono text-[11px] font-bold text-slate-950"
      aria-label={`${percent}% off`}
    >
      −{percent}%
    </span>
  );
}
