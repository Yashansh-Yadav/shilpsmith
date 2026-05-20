"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

interface Customer {
  email: string;
  name: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

function formatRupee(n: number) {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(page));
    const res = await fetch(`/api/admin/customers?${params}`);
    const body = await res.json();
    setLoading(false);
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Failed to load customers");
      return;
    }
    setItems(body.data.items);
    setTotal(body.data.total);
    setPages(body.data.pages);
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <Toaster />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-sm text-slate-500">
            {total} customers · derived from order history
          </p>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name, email, phone"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-3xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
              <th className="px-3 py-3">Name</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Phone</th>
              <th className="px-3 py-3">Orders</th>
              <th className="px-3 py-3">Total spent</th>
              <th className="px-3 py-3">Last order</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No customers yet.
                </td>
              </tr>
            )}
            {!loading &&
              items.map((c) => (
                <tr key={c.email} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-3 font-medium">{c.name || "—"}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">{c.email}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">{c.phone}</td>
                  <td className="px-3 py-3">{c.orderCount}</td>
                  <td className="px-3 py-3 font-medium">{formatRupee(c.totalSpent)}</td>
                  <td className="px-3 py-3 text-xs text-slate-500">
                    {c.lastOrderAt
                      ? new Date(c.lastOrderAt).toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/admin/customers/${encodeURIComponent(c.email)}`}
                      className="text-xs font-medium text-slate-900 hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

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
