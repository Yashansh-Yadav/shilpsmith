"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

interface CustomerDetail {
  email: string;
  name: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
  firstOrderAt: string;
  lastOrderAt: string;
  orders: {
    id: number;
    orderNumber: string;
    createdAt: string;
    status: string;
    paymentStatus: string;
    total: string;
    items: { id: number; productName: string; quantity: number }[];
    shippingAddress: null | {
      street: string;
      city: string;
      state: string;
      postalCode: string;
    };
  }[];
}

function formatRupee(n: number | string) {
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function CustomerDetailPage() {
  const params = useParams<{ email: string }>();
  const email = params?.email;
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    const res = await fetch(`/api/admin/customers/${email}`);
    const body = await res.json();
    setLoading(false);
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Failed to load customer");
      return;
    }
    setData(body.data);
  }, [email]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!data) return <p className="text-slate-500">Customer not found.</p>;

  return (
    <div className="space-y-6">
      <Toaster />

      <div>
        <Link
          href="/admin/customers"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to customers
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{data.name || data.email}</h1>
        <p className="text-sm text-slate-500">
          {data.email} · {data.phone}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Orders</p>
          <p className="mt-2 text-2xl font-bold">{data.orderCount}</p>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Lifetime value</p>
          <p className="mt-2 text-2xl font-bold">{formatRupee(data.totalSpent)}</p>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="text-xs uppercase text-slate-500">Customer since</p>
          <p className="mt-2 text-sm font-medium">
            {new Date(data.firstOrderAt).toLocaleDateString("en-IN")}
          </p>
          <p className="text-xs text-slate-500">
            Last: {new Date(data.lastOrderAt).toLocaleDateString("en-IN")}
          </p>
        </div>
      </div>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Order history
        </h2>
        <ul className="divide-y divide-slate-100">
          {data.orders.map((o) => (
            <li key={o.id} className="flex flex-wrap items-start gap-3 py-3">
              <div className="flex-1 min-w-[200px]">
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="font-mono text-sm font-medium text-slate-900 hover:underline"
                >
                  {o.orderNumber}
                </Link>
                <p className="text-xs text-slate-500">
                  {new Date(o.createdAt).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-slate-500">
                  {o.items.reduce((acc, i) => acc + i.quantity, 0)} items
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatRupee(o.total)}</p>
                <p className="text-xs text-slate-500">
                  {o.status} · {o.paymentStatus}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
