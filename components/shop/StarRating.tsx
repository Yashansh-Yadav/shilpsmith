"use client";

import { useState } from "react";

interface Props {
  value: number;
  onChange?: (rating: number) => void;
  size?: "sm" | "md" | "lg" | "xl";
  readOnly?: boolean;
  /** Interactive only — shows the word for the hovered/selected score. */
  showLabel?: boolean;
}

/** Pixel sizes rather than Tailwind classes — the partial-fill clip needs a
 *  concrete width for the overlay star so it doesn't squash inside the clip. */
const SIZE: Record<NonNullable<Props["size"]>, number> = {
  sm: 14,
  md: 20,
  lg: 28,
  xl: 36,
};

export const RATING_LABELS: Record<number, string> = {
  1: "Not great",
  2: "Could be better",
  3: "Decent",
  4: "Really good",
  5: "Love it",
};

const STAR_PATH =
  "M12 2.6l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.4l-5.8 3.06 1.1-6.46-4.69-4.58 6.49-.94L12 2.6z";

/**
 * One star drawn twice: a grey base and a gold copy clipped to `fill`. The clip
 * is what lets a 4.3 average render as four gold stars plus a 30%-filled fifth
 * instead of rounding up to a rating the product hasn't earned.
 */
function Star({ fill, px }: { fill: number; px: number }) {
  const pct = Math.max(0, Math.min(1, fill)) * 100;
  return (
    <span
      className="relative inline-block shrink-0"
      style={{ width: px, height: px }}
    >
      <svg viewBox="0 0 24 24" width={px} height={px} className="block text-slate-200">
        <path d={STAR_PATH} fill="currentColor" />
      </svg>
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${pct}%` }}
      >
        <svg
          viewBox="0 0 24 24"
          width={px}
          height={px}
          className="block max-w-none text-amber-400"
        >
          <path d={STAR_PATH} fill="currentColor" />
        </svg>
      </span>
    </span>
  );
}

export default function StarRating({
  value,
  onChange,
  size = "md",
  readOnly,
  showLabel,
}: Props) {
  const isInteractive = !readOnly && !!onChange;
  const [hover, setHover] = useState(0);
  const px = SIZE[size];

  if (!isInteractive) {
    return (
      <span
        className="inline-flex items-center gap-0.5 align-middle"
        role="img"
        aria-label={`Rated ${value.toFixed(1)} out of 5`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} fill={value - (star - 1)} px={px} />
        ))}
      </span>
    );
  }

  const shown = hover > 0 ? hover : value;

  return (
    <span className="inline-flex items-center gap-3">
      <span
        className="inline-flex items-center gap-1"
        role="radiogroup"
        aria-label="Rating"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? "s" : ""} — ${RATING_LABELS[star]}`}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => setHover(star)}
            onFocus={() => setHover(star)}
            onBlur={() => setHover(0)}
            className="rounded-md p-0.5 transition-transform duration-150 hover:scale-125 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Star fill={shown - (star - 1)} px={px} />
          </button>
        ))}
      </span>
      {showLabel && (
        <span className="text-sm font-semibold text-slate-600">
          {RATING_LABELS[Math.round(shown)] ?? ""}
        </span>
      )}
    </span>
  );
}
