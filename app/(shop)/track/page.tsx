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

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Track your order</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your order number and the email you used at checkout.
          </p>
        </header>

        <form
          onSubmit={onSubmit}
          className="mb-8 rounded-3xl bg-white p-6 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Order number
              </span>
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="ORD-20260712-12345"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 sm:w-auto"
          >
            {loading ? "Looking up…" : "Track order"}
          </button>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </form>

        {order && (
          <div className="rounded-3xl bg-white p-8 shadow-sm">
            <header className="mb-6">
              <h2 className="text-lg font-bold">Hi {order.customerName}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Order <span className="font-mono">{order.orderNumber}</span> ·
                placed {new Date(order.createdAt).toLocaleDateString("en-IN")}
              </p>
            </header>

            {!isCancelled ? (
              <ol className="mb-8 grid grid-cols-5 gap-2 text-xs">
                {STATUS_STEPS.map((s, idx) => {
                  const reached = idx <= currentStepIndex;
                  return (
                    <li
                      key={s.id}
                      className={`rounded-lg p-2 text-center ${
                        reached
                          ? "bg-emerald-100 text-emerald-700 font-medium"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {s.label}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="mb-8 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                This order is {order.status.toLowerCase()}.
              </div>
            )}

            {order.live && order.live.current.status && (
              <section className="mb-6 rounded-2xl border border-brand-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Live shipment status
                  </h3>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        order.live.delivered
                          ? "bg-emerald-500"
                          : "bg-amber-400 animate-pulse"
                      }`}
                    />
                    {order.live.delivered ? "Delivered" : "In transit"}
                  </span>
                </div>

                <div className="mt-3 rounded-xl bg-slate-50 p-3">
                  <p className="font-semibold text-slate-900">
                    {order.live.current.status}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {[order.live.current.location, formatWhen(order.live.current.dateTime)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {(order.live.origin || order.live.destination) && (
                    <p className="mt-1 text-xs text-slate-400">
                      {order.live.origin} → {order.live.destination}
                    </p>
                  )}
                </div>

                {order.live.scans.length > 0 && (
                  <ol className="mt-4 space-y-3 border-l border-slate-200 pl-4">
                    {order.live.scans.map((scan, i) => (
                      <li key={i} className="relative">
                        <span
                          className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white ${
                            i === 0 ? "bg-brand-600" : "bg-slate-300"
                          }`}
                        />
                        <p className="text-sm font-medium text-slate-800">
                          {scan.status}
                        </p>
                        <p className="text-xs text-slate-500">
                          {[scan.location, formatWhen(scan.dateTime)]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {scan.instructions && (
                          <p className="text-xs text-slate-400">
                            {scan.instructions}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}

                {order.liveSyncedAt && (
                  <p className="mt-3 text-[11px] text-slate-400">
                    Updated {formatWhen(order.liveSyncedAt)}
                  </p>
                )}
              </section>
            )}

            {order.trackingUrl && (
              <section className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <h3 className="text-sm font-semibold text-emerald-800">
                  Shipment tracking
                </h3>
                <dl className="mt-2 space-y-1 text-sm text-emerald-900">
                  {order.trackingCarrierLabel && (
                    <div className="flex justify-between">
                      <dt className="text-emerald-700">Carrier</dt>
                      <dd className="font-medium">
                        {order.trackingCarrierLabel}
                      </dd>
                    </div>
                  )}
                  {order.trackingNumber && (
                    <div className="flex justify-between">
                      <dt className="text-emerald-700">Tracking no.</dt>
                      <dd className="font-mono">{order.trackingNumber}</dd>
                    </div>
                  )}
                  {order.shippedAt && (
                    <div className="flex justify-between">
                      <dt className="text-emerald-700">Shipped on</dt>
                      <dd className="font-medium">
                        {new Date(order.shippedAt).toLocaleDateString("en-IN")}
                      </dd>
                    </div>
                  )}
                </dl>
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Track shipment →
                </a>
              </section>
            )}

            <section className="mb-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Items
              </h3>
              <ul className="divide-y divide-slate-100">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between py-3"
                  >
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-sm text-slate-500">
                        Qty: {item.quantity} · {formatRupee(item.unitPrice)} each
                      </p>
                    </div>
                    <p className="font-medium">{formatRupee(item.subtotal)}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mb-6 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
                <span>Total</span>
                <span>{formatRupee(order.total)}</span>
              </div>
            </section>

            <p className="text-sm text-slate-500">
              Payment: <strong>{order.paymentMethod}</strong> ·{" "}
              {order.paymentStatus}
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-slate-500">
          Need help?{" "}
          <Link href="/contact" className="font-medium text-brand-600">
            Contact support
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="p-10 text-slate-500">Loading…</div>}>
      <TrackInner />
    </Suspense>
  );
}
