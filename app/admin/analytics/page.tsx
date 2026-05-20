"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import toast, { Toaster } from "react-hot-toast";

import MetricsCard from "../../../components/admin/MetricsCard";

// recharts pulls in react-is at runtime; ssr:false avoids the prerender step
// trying to resolve it on the server.
const SalesChart = dynamic(() => import("../../../components/admin/SalesChart"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-3xl bg-white text-sm text-slate-500 shadow-sm">
      Loading chart…
    </div>
  ),
});

interface AnalyticsResponse {
  kpis: {
    revenueToday: number;
    revenueMonth: number;
    revenueYear: number;
    ordersToday: number;
    ordersMonth: number;
    ordersAllTime: number;
    aovMonth: number;
  };
  chart: { date: string; revenue: number; orders: number }[];
  topProducts: {
    productId: number;
    productName: string;
    revenue: number;
    quantity: number;
  }[];
  paymentBreakdown: {
    paymentMethod: string;
    orders: number;
    revenue: number;
  }[];
  range: { from: string; to: string; granularity: string };
}

const RANGES = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
] as const;

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [rangeKey, setRangeKey] =
    useState<(typeof RANGES)[number]["key"]>("30d");

  const load = useCallback(async () => {
    setLoading(true);
    const range = RANGES.find((r) => r.key === rangeKey)!;
    const from = new Date(Date.now() - range.days * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      from: from.toISOString(),
      granularity: rangeKey === "90d" ? "week" : "day",
    });
    const res = await fetch(`/api/admin/analytics?${params}`);
    const body = await res.json();
    setLoading(false);
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Failed to load analytics");
      return;
    }
    setData(body.data);
  }, [rangeKey]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <Toaster />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-sm text-slate-500">
            Revenue and order metrics. Cancelled/refunded orders excluded.
          </p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRangeKey(r.key)}
              className={`rounded-xl px-3 py-2 text-xs font-medium ${
                rangeKey === r.key
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <MetricsCard
              label="Revenue today"
              value={formatRupee(data.kpis.revenueToday)}
              helper={`${data.kpis.ordersToday} orders`}
            />
            <MetricsCard
              label="Revenue this month"
              value={formatRupee(data.kpis.revenueMonth)}
              helper={`${data.kpis.ordersMonth} orders`}
            />
            <MetricsCard
              label="Revenue YTD"
              value={formatRupee(data.kpis.revenueYear)}
            />
            <MetricsCard
              label="Avg order value (MTD)"
              value={formatRupee(data.kpis.aovMonth)}
              helper={`${data.kpis.ordersAllTime} orders all time`}
            />
          </div>

          <SalesChart data={data.chart} />

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Top products
              </h2>
              {data.topProducts.length === 0 ? (
                <p className="text-sm text-slate-500">No sales in this range.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.topProducts.map((p) => (
                    <li
                      key={p.productId}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{p.productName}</p>
                        <p className="text-xs text-slate-500">
                          {p.quantity} sold
                        </p>
                      </div>
                      <p className="font-semibold">{formatRupee(p.revenue)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Payment methods
              </h2>
              {data.paymentBreakdown.length === 0 ? (
                <p className="text-sm text-slate-500">No orders in this range.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.paymentBreakdown.map((p) => (
                    <li
                      key={p.paymentMethod}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">{p.paymentMethod}</p>
                        <p className="text-xs text-slate-500">
                          {p.orders} orders
                        </p>
                      </div>
                      <p className="font-semibold">{formatRupee(p.revenue)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
