// A small pennant-style discount tag for the top-right corner of a product
// card image. Brand-coloured with a swallowtail notch. Deliberately compact so
// it reads as a tasteful tag, not a banner. Purely presentational.

export default function DiscountRibbon({ percent }: { percent: number }) {
  return (
    <div
      className="absolute right-2.5 top-0 z-10 flex flex-col items-center bg-brand-600 px-1.5 pb-2 pt-1 text-white shadow-md"
      // Swallowtail bottom: sides hang slightly lower than the centre notch.
      style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 74%, 0 100%)" }}
      role="img"
      aria-label={`${percent}% off`}
    >
      <span className="text-[11px] font-black leading-none">{percent}%</span>
      <span className="text-[7px] font-bold uppercase leading-tight tracking-wide">
        off
      </span>
    </div>
  );
}