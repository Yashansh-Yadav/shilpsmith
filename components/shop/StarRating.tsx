"use client";

interface Props {
  value: number;
  onChange?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  readOnly?: boolean;
}

const SIZE: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
};

export default function StarRating({
  value,
  onChange,
  size = "md",
  readOnly,
}: Props) {
  const isInteractive = !readOnly && !!onChange;
  return (
    <div className={`inline-flex items-center gap-0.5 ${SIZE[size]}`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(value);
        return (
          <button
            key={star}
            type="button"
            disabled={!isInteractive}
            onClick={() => onChange?.(star)}
            aria-label={`${star} star${star > 1 ? "s" : ""}`}
            className={`leading-none ${
              isInteractive ? "cursor-pointer" : "cursor-default"
            } ${filled ? "text-amber-400" : "text-slate-300"}`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
