"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Point {
  date: string;
  revenue: number;
  orders: number;
}

interface Props {
  data: Point[];
  height?: number;
}

function formatRupee(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
}

export default function SalesChart({ data, height = 320 }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-3xl bg-white text-sm text-slate-500 shadow-sm">
        No sales in this range yet.
      </div>
    );
  }
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Revenue
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={formatRupee} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v: number, name: string) =>
              name === "revenue" ? formatRupee(v) : v
            }
            labelStyle={{ fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#0f172a"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
