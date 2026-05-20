"use client";

interface Props {
  label: string;
  value: string;
  helper?: string;
  trend?: { delta: number; period: string };
}

export default function MetricsCard({ label, value, helper, trend }: Props) {
  const positive = trend && trend.delta >= 0;
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {helper && (
        <p className="mt-1 text-xs text-slate-500">{helper}</p>
      )}
      {trend && (
        <p
          className={`mt-2 text-xs font-medium ${
            positive ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {positive ? "▲" : "▼"} {Math.abs(trend.delta).toFixed(1)}%{" "}
          <span className="text-slate-400">vs {trend.period}</span>
        </p>
      )}
    </div>
  );
}
