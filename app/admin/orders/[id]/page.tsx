"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

import OrderStatusTimeline, {
  type OrderStatus,
} from "../../../../components/admin/OrderStatusTimeline";

interface OrderDetail {
  id: number;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  subtotal: string;
  shipping: string;
  tax: string;
  discount: string;
  total: string;
  status: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  paymentReference: string | null;
  notes: string | null;
  internalNotes: string | null;
  items: {
    id: number;
    productName: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
    customization: unknown;
  }[];
  shippingAddress: null | {
    fullName: string;
    phone: string;
    email: string | null;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  billingAddress: null | OrderDetail["shippingAddress"];
}

const STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "BY_MISTAKE",
];

function statusLabel(s: string) {
  return s.replace(/_/g, " ");
}

function formatRupee(n: number | string) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await fetch(`/api/admin/orders/${id}`);
    const body = await res.json();
    setLoading(false);
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Failed to load order");
      return;
    }
    setOrder(body.data);
    setNotes(body.data.internalNotes ?? "");
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(status: OrderStatus) {
    if (!order) return;
    setSavingStatus(true);
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = await res.json();
    setSavingStatus(false);
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Update failed");
      return;
    }
    toast.success(`Status → ${status}`);
    setOrder((cur) => (cur ? { ...cur, status } : cur));
  }

  async function deleteOrder() {
    if (!order) return;
    if (
      !confirm(
        "Delete this order? It will be removed from the store and excluded from analytics. This can't be undone from the admin."
      )
    )
      return;
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: "DELETE",
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Delete failed");
      return;
    }
    toast.success("Order deleted");
    router.push("/admin/orders");
  }

  async function saveNotes() {
    if (!order) return;
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ internalNotes: notes }),
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Save failed");
      return;
    }
    toast.success("Notes saved");
  }

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!order) return <p className="text-slate-500">Order not found.</p>;

  return (
    <div className="space-y-6">
      <Toaster />

      <div>
        <Link
          href="/admin/orders"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to orders
        </Link>
        <h1 className="mt-2 text-3xl font-bold">
          Order <span className="font-mono">{order.orderNumber}</span>
        </h1>
        <p className="text-sm text-slate-500">
          Placed {new Date(order.createdAt).toLocaleString("en-IN")}
        </p>
      </div>

      <OrderStatusTimeline status={order.status} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
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
                        ([k, v]) => {
                          const val = String(v);
                          const isUrl = /^https?:\/\//i.test(val);
                          return (
                            <div key={k} className="flex items-center gap-1.5">
                              <dt className="inline font-medium">{k}:</dt>{" "}
                              {isUrl ? (
                                <a
                                  href={val}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 align-middle"
                                >
                                  <img
                                    src={val}
                                    alt={k}
                                    className="h-10 w-10 rounded border border-slate-200 object-cover"
                                  />
                                  <span className="text-slate-900 underline">View</span>
                                </a>
                              ) : (
                                <dd className="inline">{val}</dd>
                              )}
                            </div>
                          );
                        }
                      )}
                    </dl>
                  )}
                </div>
                <p className="font-medium">{formatRupee(item.subtotal)}</p>
              </li>
            ))}
          </ul>

          <dl className="space-y-1 border-t border-slate-100 pt-4 text-sm">
            <Row label="Subtotal" value={formatRupee(order.subtotal)} />
            <Row
              label="Shipping"
              value={
                Number(order.shipping) === 0 ? "Free" : formatRupee(order.shipping)
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

        <aside className="space-y-6">
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Customer
            </h2>
            <p className="font-medium">{order.customerName}</p>
            <p className="text-sm text-slate-500">{order.customerEmail}</p>
            <p className="text-sm text-slate-500">{order.customerPhone}</p>
            <Link
              href={`/admin/customers/${encodeURIComponent(order.customerEmail)}`}
              className="mt-2 inline-block text-xs font-medium text-slate-900 hover:underline"
            >
              View customer →
            </Link>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Status
            </h2>
            <select
              disabled={savingStatus}
              value={order.status}
              onChange={(e) => updateStatus(e.target.value as OrderStatus)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
            <p className="mt-3 text-sm">
              Payment: <strong>{order.paymentMethod}</strong> ·{" "}
              <span className="text-slate-500">{order.paymentStatus}</span>
            </p>
            {order.paymentReference && (
              <p className="mt-1 break-all text-xs text-slate-500">
                Ref: {order.paymentReference}
              </p>
            )}
          </section>

          <section className="rounded-3xl border border-red-100 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-red-600">
              Danger zone
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              Remove this order from the store and analytics. For genuine orders
              prefer a status change (e.g. Cancelled or By mistake) so history is
              kept.
            </p>
            <button
              type="button"
              onClick={deleteOrder}
              className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              Delete order
            </button>
          </section>

          {order.shippingAddress && (
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Shipping
              </h2>
              <address className="not-italic text-sm leading-6">
                {order.shippingAddress.fullName}
                <br />
                {order.shippingAddress.street}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.postalCode}
                <br />
                {order.shippingAddress.country}
                <br />
                {order.shippingAddress.phone}
              </address>
            </section>
          )}

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Internal notes
            </h2>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Visible to admins only"
            />
            <button
              type="button"
              onClick={saveNotes}
              className="mt-2 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Save notes
            </button>
          </section>
        </aside>
      </div>
    </div>
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
