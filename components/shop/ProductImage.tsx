"use client";

interface Props {
  src?: string | null;
  alt: string;
  // Used to stably pick a placeholder message — same product always shows the
  // same copy so the page doesn't visibly reshuffle on hover/scroll.
  productId?: number | string;
  aspectClass?: string;
  variant?: "full" | "mini";
  // How the real image fills its box. "cover" crops to fill (cards/thumbnails);
  // "contain" shows the whole product without cropping (gallery main image).
  fit?: "cover" | "contain";
  className?: string;
  // Optional: pass the product name as a small footer label inside the
  // placeholder (used by ProductModal's large hero placeholder).
  caption?: string;
}

// Rotating teaser messages. Stable per-product via id-modulo so a given card
// always shows the same line — feels intentional, not random.
const MESSAGES = [
  { emoji: "🖨️", text: "Fresh print incoming" },
  { emoji: "✨", text: "Preview dropping soon" },
  { emoji: "🪄", text: "Photo being crafted" },
  { emoji: "🚀", text: "New shot coming up" },
  { emoji: "🧵", text: "Filament loading…" },
  { emoji: "📦", text: "Just out of the kiln" },
];

function pickMessage(seed?: number | string) {
  if (seed == null) return MESSAGES[0];
  const n =
    typeof seed === "number"
      ? seed
      : Array.from(String(seed)).reduce((a, c) => a + c.charCodeAt(0), 0);
  return MESSAGES[Math.abs(n) % MESSAGES.length];
}

// Decorative SVG: three concentric arcs that hint at a 3D-print layer pattern.
function PrinterArcs() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full text-brand-600/20"
      viewBox="0 0 200 200"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="0.7" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="0.7" />
      <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" strokeWidth="0.7" />
      <circle cx="100" cy="100" r="20" fill="none" stroke="currentColor" strokeWidth="0.7" />
    </svg>
  );
}

export default function ProductImage({
  src,
  alt,
  productId,
  aspectClass = "aspect-[4/5]",
  variant = "full",
  fit = "cover",
  className = "",
  caption,
}: Props) {
  // Real image path.
  if (src) {
    return (
      <div
        className={`relative overflow-hidden bg-slate-100 ${aspectClass} ${className}`}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`absolute inset-0 h-full w-full ${
            fit === "contain" ? "object-contain" : "object-cover"
          }`}
        />
      </div>
    );
  }

  const message = pickMessage(productId);

  // Mini variant — used for cart thumbnails, inventory rows, etc.
  if (variant === "mini") {
    return (
      <div
        className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand-50 via-white to-cyan-50 ${aspectClass} ${className}`}
        title={message.text}
      >
        <PrinterArcs />
        <span className="relative text-2xl" aria-label={message.text}>
          {message.emoji}
        </span>
      </div>
    );
  }

  // Full variant — used by ProductCard, ProductModal, search grid.
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-cyan-50 ${aspectClass} ${className}`}
    >
      <PrinterArcs />

      <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
        <div className="text-4xl sm:text-5xl">{message.emoji}</div>

        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-brand-600/20 backdrop-blur">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-600 opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-600" />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-700 sm:text-xs">
            {message.text}
          </span>
        </div>

        {caption && (
          <p className="mt-1 max-w-[80%] text-xs text-slate-500 line-clamp-2">
            {caption}
          </p>
        )}
      </div>
    </div>
  );
}
