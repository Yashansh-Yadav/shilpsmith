import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "../../../../lib/prisma";
import { carrierLabel } from "../../../../lib/carriers";

function formatRupee(n: number | string | { toString(): string }) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

const STATUS_STEPS = [
  { id: "PENDING", label: "Placed" },
  { id: "CONFIRMED", label: "Confirmed" },
  { id: "PROCESSING", label: "Processing" },
  { id: "SHIPPED", label: "Shipped" },
  { id: "DELIVERED", label: "Delivered" },
] as const;

type Params = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
};

export default async function OrderConfirmationPage({
  params,
  searchParams,
}: Params) {
  const { id } = await params;
  const { t: token } = await searchParams;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();

  // This page renders name, phone, email and full address, and `id` is
  // sequential — so the token is what stops someone counting 1..n and scraping
  // every customer. Treat a missing/wrong token exactly like a missing order so
  // neither case confirms the other exists.
  if (!token) notFound();

  const order = await prisma.order.findFirst({
    where: { id: orderId, guestToken: token, deletedAt: null },
    include: {
      items: true,
      shippingAddress: true,
    },
  });
  if (!order) notFound();

  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.id === order.status);

  // Chrome (header, footer, cart drawer, toasts) comes from app/(shop)/layout.tsx.
  return (
    <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8 lg:py-20">
      <header className="mb-10 text-center">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-brand-500 font-display text-3xl font-bold text-slate-950 shadow-[0_12px_40px_-8px_rgba(16,185,129,.7)]">
          ✓
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
          Order <span className="text-slate-900">{order.orderNumber}</span>
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.035em] text-slate-900 sm:text-5xl">
          Thank you, {order.customerName}!
        </h1>
        <p className="mt-3 text-slate-500">
          Placed on {new Date(order.createdAt).toLocaleString("en-IN")}
        </p>
      </header>

      <div className="space-y-5">
        {/* Status timeline */}
        {order.status !== "CANCELLED" && order.status !== "REFUNDED" && (
          <section className="rounded-[2rem] bg-white p-6 ring-1 ring-slate-200/70 sm:p-8">
            <ol className="flex items-start" aria-label="Order status">
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
                      className={`mt-2 text-center text-[11px] font-semibold leading-tight sm:block sm:text-xs ${current ? "block" : "hidden"} ${reached ? "text-slate-900" : "text-slate-400"}`}
                    >
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {order.trackingUrl && (
          <section className="rounded-[2rem] bg-slate-950 p-6 text-white sm:p-8">
            <h2 className="font-display text-xl font-semibold tracking-tight">Shipment tracking</h2>
            <dl className="mt-4 space-y-2 text-[15px]">
              {order.trackingCarrier && (
                <div className="flex justify-between">
                  <dt className="text-slate-400">Carrier</dt>
                  <dd className="font-medium">{carrierLabel(order.trackingCarrier)}</dd>
                </div>
              )}
              {order.trackingNumber && (
                <div className="flex justify-between">
                  <dt className="text-slate-400">Tracking no.</dt>
                  <dd className="font-mono">{order.trackingNumber}</dd>
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
          <h2 className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">Items</h2>
          <ul className="divide-y divide-slate-100">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="font-display font-semibold tracking-tight text-slate-900">{item.productName}</p>
                  <p className="mt-0.5 font-mono text-sm text-slate-500">
                    × {item.quantity} · {formatRupee(item.unitPrice)} each
                  </p>
                  {item.customization && Object.keys(item.customization as object).length > 0 && (
                    <dl className="mt-2 space-y-0.5 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {Object.entries(item.customization as Record<string, unknown>).map(([k, v]) => (
                        <div key={k}>
                          <dt className="inline font-semibold capitalize text-slate-700">{k}:</dt>{" "}
                          <dd className="inline">{String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
                <p className="font-mono font-semibold text-slate-900">{formatRupee(item.subtotal)}</p>
              </li>
            ))}
          </ul>

          <dl className="mt-2 space-y-2 border-t border-slate-100 pt-5 text-[15px]">
            <Row label="Subtotal" value={formatRupee(order.subtotal)} />
            <Row
              label="Shipping"
              value={Number(order.shipping) === 0 ? "Free" : formatRupee(order.shipping)}
            />
            <Row label="Tax" value={formatRupee(order.tax)} />
            {Number(order.discount) > 0 && (
              <Row label="Discount" value={`− ${formatRupee(order.discount)}`} />
            )}
            <div className="flex items-baseline justify-between border-t border-slate-100 pt-4">
              <dt className="font-display text-lg font-semibold">Total</dt>
              <dd className="font-mono text-2xl font-bold">{formatRupee(order.total)}</dd>
            </div>
          </dl>
        </section>

        <div className="grid gap-5 sm:grid-cols-2">
          {order.shippingAddress && (
            <section className="rounded-[2rem] bg-white p-6 ring-1 ring-slate-200/70">
              <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">Shipping to</h2>
              <address className="not-italic text-[15px] leading-7 text-slate-700">
                {order.shippingAddress.fullName}
                <br />
                {order.shippingAddress.street}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                <br />
                {order.shippingAddress.phone}
                {order.shippingAddress.email && (
                  <>
                    <br />
                    {order.shippingAddress.email}
                  </>
                )}
              </address>
            </section>
          )}
          <section className="rounded-[2rem] bg-white p-6 ring-1 ring-slate-200/70">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">Payment</h2>
            <p className="font-display text-lg font-semibold tracking-tight text-slate-900">{order.paymentMethod}</p>
            <p className="mt-1 font-mono text-sm text-slate-500">{order.paymentStatus}</p>
          </section>
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Link
            href="/search"
            className="flex-1 rounded-full bg-white px-6 py-4 text-center font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:ring-slate-400"
          >
            Continue shopping
          </Link>
          {process.env.NEXT_PUBLIC_WHATSAPP_NUMBER && (
            <a
              href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(
                `Hi, I need help with order ${order.orderNumber}`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-full bg-slate-900 px-6 py-4 text-center font-semibold text-white transition hover:bg-slate-800"
            >
              Contact support
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-mono font-medium">{value}</dd>
    </div>
  );
}
