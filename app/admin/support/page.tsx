"use client";

import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

interface Ticket {
  id: number;
  name: string;
  email: string;
  phone: string;
  category: string;
  orderNumber: string;
  message: string;
  status: string;
  createdAt: string;
}

const STATUSES = ["new", "in-progress", "resolved", "closed"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  order: "Existing order",
  product: "Product question",
  custom: "Custom order",
  shipping: "Shipping",
  payment: "Payment / refund",
  other: "Other",
};

const STATUS_STYLES: Record<string, string> = {
  new: "bg-amber-100 text-amber-700",
  "in-progress": "bg-blue-100 text-blue-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-200 text-slate-600",
};

const PAGE_SIZE = 20;

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    const res = await fetch(`/api/admin/support?${params}`);
    const body = await res.json();
    setLoading(false);
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Failed to load requests");
      return;
    }
    setTickets(body.data.items);
    setTotal(body.data.total);
    setPages(body.data.pages);
  }, [statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  async function updateStatus(id: number, status: string) {
    const res = await fetch(`/api/admin/support/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Update failed");
      return;
    }
    setTickets((t) => t.map((x) => (x.id === id ? { ...x, status } : x)));
    toast.success("Status updated");
  }

  async function remove(id: number) {
    if (!confirm("Delete this request?")) return;
    const res = await fetch(`/api/admin/support/${id}`, { method: "DELETE" });
    const body = await res.json();
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Delete failed");
      return;
    }
    setTickets((t) => t.filter((x) => x.id !== id));
    toast.success("Deleted");
  }

  return (
    <div className="space-y-6">
      <Toaster />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Support</h1>
          <p className="text-sm text-slate-500">
            {total} request{total === 1 ? "" : "s"} · page {page} of {pages}
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : tickets.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center text-slate-500 shadow-sm">
          No support requests {statusFilter ? `with status "${statusFilter}"` : "yet"}.
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => (
            <div key={t.id} className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{t.name}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        STATUS_STYLES[t.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {t.status}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                      {CATEGORY_LABELS[t.category] ?? t.category}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                    <a href={`mailto:${t.email}`} className="hover:underline">
                      {t.email}
                    </a>
                    {t.phone && <span>{t.phone}</span>}
                    {t.orderNumber && (
                      <span className="font-mono">{t.orderNumber}</span>
                    )}
                    <span>{new Date(t.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={t.status}
                    onChange={(e) => updateStatus(t.id, e.target.value)}
                    className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => remove(t.id)}
                    className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                {t.message}
              </p>

              <a
                href={`mailto:${t.email}?subject=Re: your ShilpSmith request${
                  t.orderNumber ? ` (${t.orderNumber})` : ""
                }`}
                className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline"
              >
                Reply by email →
              </a>
            </div>
          ))}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm disabled:opacity-50"
          >
            ← Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {page} of {pages}
          </span>
          <button
            type="button"
            disabled={page === pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm disabled:opacity-50"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
