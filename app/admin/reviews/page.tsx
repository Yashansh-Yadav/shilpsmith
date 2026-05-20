"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

import StarRating from "../../../components/shop/StarRating";

interface Review {
  id: number;
  productId: number;
  rating: number;
  title: string | null;
  comment: string | null;
  customerName: string | null;
  customerEmail: string | null;
  approved: boolean;
  createdAt: string;
  product: { id: number; name: string; slug: string };
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/reviews?status=${filter}`);
    const body = await res.json();
    setLoading(false);
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Failed to load reviews");
      return;
    }
    setReviews(body.data);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function setApproval(id: number, approved: boolean) {
    const res = await fetch(`/api/admin/reviews/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved }),
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Update failed");
      return;
    }
    toast.success(approved ? "Approved" : "Hidden");
    setReviews((cur) =>
      cur.map((r) => (r.id === id ? { ...r, approved } : r))
    );
  }

  async function remove(id: number) {
    if (!confirm("Delete this review permanently?")) return;
    const res = await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
    const body = await res.json();
    if (!res.ok || !body.success) {
      toast.error(body?.error?.message ?? "Delete failed");
      return;
    }
    toast.success("Review deleted");
    setReviews((cur) => cur.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-6">
      <Toaster />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Reviews</h1>
          <p className="text-sm text-slate-500">
            New reviews land in <strong>Pending</strong> and are hidden from the
            product page until approved.
          </p>
        </div>
        <div className="flex gap-2">
          {(["pending", "approved", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-xl px-3 py-2 text-xs font-medium ${
                filter === f
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : reviews.length === 0 ? (
        <p className="text-slate-500">Nothing in this queue.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2">
                    <StarRating value={r.rating} readOnly size="sm" />
                    <span className="text-sm font-medium">
                      {r.customerName ?? "Customer"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.approved
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {r.approved ? "Approved" : "Pending"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {r.customerEmail} ·{" "}
                    {new Date(r.createdAt).toLocaleString("en-IN")}
                  </p>
                  <p className="mt-2 text-xs">
                    On{" "}
                    <Link
                      href={`/admin/inventory`}
                      className="font-mono text-slate-700 hover:underline"
                    >
                      {r.product.name}
                    </Link>
                  </p>
                  {r.title && (
                    <p className="mt-2 font-semibold">{r.title}</p>
                  )}
                  {r.comment && (
                    <p className="mt-1 text-sm text-slate-600">{r.comment}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {r.approved ? (
                    <button
                      type="button"
                      onClick={() => setApproval(r.id, false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium hover:bg-slate-50"
                    >
                      Unapprove
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setApproval(r.id, true)}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(r.id)}
                    className="rounded-xl border border-red-200 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
