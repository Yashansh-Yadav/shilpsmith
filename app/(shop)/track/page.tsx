"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface TrackedItem {
  id: number;
  productName: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

interface LiveScan {
  status: string;
  statusCode: string;
  location: string;
  dateTime: string;
  instructions: string;
}

interface LiveTracking {
  awb: string;
  current: {
    status: string;
    statusType: string;
    statusCode: string;
    location: string;
    dateTime: string;
  };
  origin: string;
  destination: string;
  scans: LiveScan[];
  delivered: boolean;
}

interface TrackedOrder {
  orderNumber: string;
  customerName: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: string;
  shipping: string;
  tax: string;
  discount: string;
  total: string;
  trackingCarrier: string | null;
  trackingCarrierLabel: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  createdAt: string;
  items: TrackedItem[];
  live: LiveTracking | null;
  liveSyncedAt: string | null;
}

const STATUS_STEPS = [
  { id: "PENDING", label: "Placed" },
  { id: "CONFIRMED", label: "Confirmed" },
  { id: "PROCESSING", label: "Processing" },
  { id: "SHIPPED", label: "Shipped" },
  { id: "DELIVERED", label: "Delivered" },
] as const;

function formatRupee(n: number | string) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

// iThink datetimes come as strings in varying formats; render a friendly value
// when parseable, otherwise fall back to the raw string.
function formatWhen(s: string) {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString("en-IN");
}

function TrackInner() {
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const lookup = useCallback(async (num: string, mail: string) => {
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const res = await fetch(
        `/api/orders/track?orderNumber=${encodeURIComponent(
          num
        )}&email=${encodeURIComponent(mail)}`
      );
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body?.error?.message ?? "Could not find that order.");
        return;
      }
      setOrder(body.data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Prefill + auto-lookup from a deep link (e.g. the shipped email button).
  useEffect(() => {
    const num = searchParams.get("orderNumber") ?? "";
    const mail = searchParams.get("email") ?? "";
    if (num) setOrderNumber(num);
    if (mail) setEmail(mail);
    if (num && mail) lookup(num, mail);
  }, [searchParams, lookup]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) return;
    lookup(orderNumber.trim(), email.trim());
  }

  const isCancelled =
    order?.status === "CANCELLED" || order?.status === "REFUNDED";
  const currentStepIndex = order
    ? STATUS_STEPS.findIndex((s) => s.id === order.status)
    : -1;

  const inputCls =
    "w-full rounded-2xl bg-white px-4 py-3.5 text-[15px] text-slate-900 ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500";
  const sectionLabel = "mb-3 font-mono text-xs uppercase tracking-[0.18em] text-slate-500";

  // Chrome (header, footer, cart drawer, toasts) comes from app/(shop)/layout.tsx.
  return (
    <>
      {/* Dark title band — same "build chamber" field as the homepage hero. */}
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <div aria-hidden="true" className="plate-grid absolute inset-0 -z-10" />
        <div aria-hidden="true" className="heated-bed absolute inset-0 -z-10" />
        <div className="mx-auto max-w-3xl px-5 pb-28 pt-16 sm:px-8 lg:pt-24">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-300">Order status</p>
          <h1 className="mt-4 font-display text-5xl font-semibold leading-[0.95] tracking-[-0.04em] sm:text-6xl">
            Track your order
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-300">
            Enter your order number and the email you used at checkout.
          </p>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-16 max-w-3xl px-5 pb-20 sm:px-8">
        <form onSubmit={onSubmit} className="rounded-[2rem] bg-white p-6 shadow-xl shadow-slate-900/5 ring-1 ring-slate-200/70 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Order number</span>
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="ORD-20260712-12345"
                className={`${inputCls} font-mono`}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputCls}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-7 py-4 font-semibold text-slate-950 transition hover:brightness-110 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {loading ? "Looking up…" : "Track order →"}
          </button>
          {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
        </form>

        {order && (
          <div className="mt-6 space-y-5">
            <section className="rounded-[2rem] bg-white p-6 ring-1 ring-slate-200/70 sm:p-8">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                Order <span className="text-slate-900">{order.orderNumber}</span> · placed{" "}
                {new Date(order.createdAt).toLocaleDateString("en-IN")}
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-900">
                Hi {order.customerName}
              </h2>

              {!isCancelled ? (
                <ol className="mt-8 flex items-start" aria-label="Order status">
                  {STATUS_STEPS.map((s, idx) => {
                    const reached = idx <= currentStepIndex;
                    const current = idx === currentStepIndex;
                    return (
                      <li key={s.id} className="relative flex flex-1 flex-col items-center text-center">
                        {idx > 0 && (
                          <span
                            aria-hidden="true"
                            className={`absolute right-1/2 top-4 h-0.5 w-full ${reached ? "bg-brand-400" : "bg-slate-200"}`}
                          />
                        )}
                        <span
                          className={`relative grid h-8 w-8 place-items-center rounded-full font-mono text-xs font-bold ${
                            current
                              ? "bg-slate-900 text-white"
                              : reached
                                ? "bg-brand-500 text-slate-950"
                                : "bg-white text-slate-400 ring-1 ring-slate-200"
                          }`}
                          aria-current={current ? "step" : undefined}
                        >
                          {reached && !current ? "✓" : idx + 1}
                        </span>
                        <span
                          className={`mt-2 text-[11px] font-semibold sm:text-xs ${reached ? "text-slate-900" : "text-slate-400"}`}
                        >
                          {s.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-[15px] font-medium text-amber-800 ring-1 ring-amber-200">
                  This order is {order.status.toLowerCase()}.
                </div>
              )}
            </section>

            {order.live && order.live.current.status && (
              <section className="rounded-[2rem] bg-white p-6 ring-1 ring-slate-200/70 sm:p-8">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-display text-xl font-semibold tracking-tight">Live shipment status</h3>
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-500">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        order.live.delivered ? "bg-brand-500" : "animate-pulse bg-amber-400"
                      }`}
                    />
                    {order.live.delivered ? "Delivered" : "In transit"}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{order.live.current.status}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {[order.live.current.location, formatWhen(order.live.current.dateTime)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {(order.live.origin || order.live.destination) && (
                    <p className="mt-1 font-mono text-xs text-slate-400">
                      {order.live.origin} → {order.live.destination}
                    </p>
                  )}
                </div>

                {order.live.scans.length > 0 && (
                  <ol className="mt-5 space-y-4 border-l-2 border-slate-100 pl-5">
                    {order.live.scans.map((scan, i) => (
                      <li key={i} className="relative">
                        <span
                          className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${
                            i === 0 ? "bg-brand-500" : "bg-slate-300"
                          }`}
                        />
                        <p className="text-[15px] font-medium text-slate-800">{scan.status}</p>
                        <p className="text-sm text-slate-500">
                          {[scan.location, formatWhen(scan.dateTime)].filter(Boolean).join(" · ")}
                        </p>
                        {scan.instructions && <p className="text-xs text-slate-400">{scan.instructions}</p>}
                      </li>
                    ))}
                  </ol>
                )}

                {order.liveSyncedAt && (
                  <p className="mt-4 font-mono text-[11px] text-slate-400">Updated {formatWhen(order.liveSyncedAt)}</p>
                )}
              </section>
            )}

            {order.trackingUrl && (
              <section className="rounded-[2rem] bg-slate-950 p-6 text-white sm:p-8">
                <h3 className="font-display text-xl font-semibold tracking-tight">Shipment tracking</h3>
                <dl className="mt-4 space-y-2 text-[15px]">
                  {order.trackingCarrierLabel && (
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Carrier</dt>
                      <dd className="font-medium">{order.trackingCarrierLabel}</dd>
                    </div>
                  )}
                  {order.trackingNumber && (
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Tracking no.</dt>
                      <dd className="font-mono">{order.trackingNumber}</dd>
                    </div>
                  )}
                  {order.shippedAt && (
                    <div className="flex justify-between">
                      <dt className="text-slate-400">Shipped on</dt>
                      <dd className="font-medium">{new Date(order.shippedAt).toLocaleDateString("en-IN")}</dd>
                    </div>
                  )}
                </dl>
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-6 py-3.5 font-semibold text-slate-950 transition hover:brightness-110"
                >
                  Track shipment →
                </a>
              </section>
            )}

            <section className="rounded-[2rem] bg-white p-6 ring-1 ring-slate-200/70 sm:p-8">
              <h3 className={sectionLabel}>Items</h3>
              <ul className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-4 py-4">
                    <div className="min-w-0">
                      <p className="font-display font-semibold tracking-tight text-slate-900">{item.productName}</p>
                      <p className="mt-0.5 font-mono text-sm text-slate-500">
                        × {item.quantity} · {formatRupee(item.unitPrice)} each
                      </p>
                    </div>
                    <p className="font-mono font-semibold text-slate-900">{formatRupee(item.subtotal)}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex items-baseline justify-between border-t border-slate-100 pt-4">
                <span className="font-display text-lg font-semibold">Total</span>
                <span className="font-mono text-2xl font-bold">{formatRupee(order.total)}</span>
              </div>
              <p className="mt-4 text-sm text-slate-500">
                Payment: <span className="font-semibold text-slate-700">{order.paymentMethod}</span> ·{" "}
                <span className="font-mono">{order.paymentStatus}</span>
              </p>
            </section>
          </div>
        )}

        <p className="mt-10 text-center text-[15px] text-slate-500">
          Need help?{" "}
          <Link href="/contact" className="font-semibold text-brand-700 underline-offset-4 hover:underline">
            Contact support
          </Link>
        </p>
      </div>
    </>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-5 py-20 text-slate-500 sm:px-8">Loading…</div>}>
      <TrackInner />
    </Suspense>
  );
}
