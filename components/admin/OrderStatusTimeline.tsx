"use client";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "BY_MISTAKE";

const STEPS: { id: OrderStatus; label: string }[] = [
  { id: "PENDING", label: "Placed" },
  { id: "CONFIRMED", label: "Confirmed" },
  { id: "PROCESSING", label: "Processing" },
  { id: "SHIPPED", label: "Shipped" },
  { id: "DELIVERED", label: "Delivered" },
];

interface Props {
  status: OrderStatus;
}

export default function OrderStatusTimeline({ status }: Props) {
  const terminated =
    status === "CANCELLED" || status === "REFUNDED" || status === "BY_MISTAKE";
  const currentIndex = STEPS.findIndex((s) => s.id === status);

  if (terminated) {
    const label =
      status === "CANCELLED"
        ? "Order cancelled."
        : status === "REFUNDED"
          ? "Order refunded."
          : "Marked as placed by mistake — excluded from analytics.";
    return (
      <div
        className={`rounded-2xl p-4 text-sm font-medium ${
          status === "CANCELLED"
            ? "bg-red-50 text-red-700"
            : status === "REFUNDED"
              ? "bg-amber-50 text-amber-700"
              : "bg-slate-100 text-slate-600"
        }`}
      >
        {label}
      </div>
    );
  }

  return (
    <ol className="grid grid-cols-5 gap-2 text-xs">
      {STEPS.map((s, idx) => {
        const reached = idx <= currentIndex;
        const isCurrent = idx === currentIndex;
        return (
          <li
            key={s.id}
            className={`rounded-lg p-2 text-center ${
              reached
                ? isCurrent
                  ? "bg-slate-900 text-white font-medium"
                  : "bg-emerald-100 text-emerald-700 font-medium"
                : "bg-slate-100 text-slate-400"
            }`}
          >
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}
