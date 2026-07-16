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

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <header className="mb-6 text-center">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">
              ✓
            </div>
            <h1 className="text-2xl font-bold">Thank you, {order.customerName}!</h1>
            <p className="mt-1 text-sm text-slate-500">
              Order <span className="font-mono">{order.orderNumber}</span> placed
              on {new Date(order.createdAt).toLocaleString("en-IN")}
            </p>
          </header>

          {/* Status timeline */}
          {order.status !== "CANCELLED" && order.status !== "REFUNDED" && (
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
          )}

          {order.trackingUrl && (
            <section className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <h2 className="text-sm font-semibold text-emerald-800">
                Shipment tracking
              </h2>
              <dl className="mt-2 space-y-1 text-sm text-emerald-900">
                {order.trackingCarrier && (
                  <div className="flex justify-between">
                    <dt className="text-emerald-700">Carrier</dt>
                    <dd className="font-medium">
                      {carrierLabel(order.trackingCarrier)}
                    </dd>
                  </div>
                )}
                {order.trackingNumber && (
                  <div className="flex justify-between">
                    <dt className="text-emerald-700">Tracking no.</dt>
                    <dd className="font-mono">{order.trackingNumber}</dd>
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
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Items
            </h2>
            <ul className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between py-3">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-sm text-slate-500">
                      Qty: {item.quantity} · {formatRupee(item.unitPrice)} each
                    </p>
                    {item.customization && Object.keys(item.customization as object).length > 0 && (
                      <dl className="mt-1 text-xs text-slate-500">
                        {Object.entries(item.customization as Record<string, unknown>).map(
                          ([k, v]) => (
                            <div key={k}>
                              <dt className="inline font-medium">{k}:</dt>{" "}
                              <dd className="inline">{String(v)}</dd>
                            </div>
                          )
                        )}
                      </dl>
                    )}
                  </div>
                  <p className="font-medium">{formatRupee(item.subtotal)}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-6 rounded-2xl bg-slate-50 p-4 text-sm">
            <dl className="space-y-1">
              <Row label="Subtotal" value={formatRupee(order.subtotal)} />
              <Row
                label="Shipping"
                value={
                  Number(order.shipping) === 0
                    ? "Free"
                    : formatRupee(order.shipping)
                }
              />
              <Row label="Tax" value={formatRupee(order.tax)} />
              {Number(order.discount) > 0 && (
                <Row label="Discount" value={`− ${formatRupee(order.discount)}`} />
              )}
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd>{formatRupee(order.total)}</dd>
              </div>
            </dl>
          </section>

          {order.shippingAddress && (
            <section className="mb-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Shipping to
              </h2>
              <address className="not-italic text-sm leading-6 text-slate-700">
                {order.shippingAddress.fullName}
                <br />
                {order.shippingAddress.street}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.postalCode}
                <br />
                {order.shippingAddress.phone}
                {order.shippingAddress.email && ` · ${order.shippingAddress.email}`}
              </address>
            </section>
          )}

          <section className="mb-6 text-sm">
            <p>
              Payment: <strong>{order.paymentMethod}</strong> ·{" "}
              <span className="text-slate-500">{order.paymentStatus}</span>
            </p>
          </section>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/"
              className="flex-1 rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold hover:bg-slate-50"
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
                className="flex-1 rounded-xl bg-brand-600 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-brand-700"
              >
                Contact support
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
