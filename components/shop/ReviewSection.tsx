"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import StarRating from "./StarRating";

interface ReviewItem {
  id: number;
  rating: number;
  title: string | null;
  comment: string | null;
  customerName: string | null;
  createdAt: string;
}

interface Summary {
  average: number;
  count: number;
}

interface Props {
  productId: number;
}

export default function ReviewSection({ productId }: Props) {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ average: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    rating: 5,
    customerName: "",
    customerEmail: "",
    title: "",
    comment: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/reviews?productId=${productId}`);
      const body = await r.json();
      if (body?.success) {
        setReviews(body.data.reviews);
        setSummary(body.data.summary);
      }
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        rating: form.rating,
        customerEmail: form.customerEmail,
        customerName: form.customerName,
        ...(form.title ? { title: form.title } : {}),
        ...(form.comment ? { comment: form.comment } : {}),
      }),
    });
    const body = await res.json();
    setSubmitting(false);

    if (!res.ok || !body.success) {
      const detail = body?.error?.details?.[0];
      toast.error(
        detail
          ? `${detail.field ?? "field"}: ${detail.message}`
          : body?.error?.message ?? "Could not submit review"
      );
      return;
    }
    toast.success("Thanks! Your review is pending moderation.");
    setForm({
      rating: 5,
      customerName: "",
      customerEmail: "",
      title: "",
      comment: "",
    });
    setShowForm(false);
    load();
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Reviews
        </h3>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="text-xs font-medium text-slate-900 hover:underline"
        >
          {showForm ? "Cancel" : "Write a review"}
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <StarRating value={summary.average} readOnly size="sm" />
        <span className="text-sm text-slate-500">
          {summary.count > 0
            ? `${summary.average.toFixed(1)} · ${summary.count} review${summary.count > 1 ? "s" : ""}`
            : "No reviews yet"}
        </span>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-4 space-y-3 rounded-2xl border border-slate-100 p-4"
        >
          <p className="text-xs text-slate-500">
            Reviews are restricted to verified buyers — use the email you placed your order with.
          </p>
          <div className="flex items-center gap-3">
            <span className="text-sm">Rating</span>
            <StarRating
              value={form.rating}
              onChange={(r) => setForm({ ...form, rating: r })}
              size="md"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              required
              type="text"
              placeholder="Your name"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              required
              type="email"
              placeholder="Email on the order"
              value={form.customerEmail}
              onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <input
            type="text"
            placeholder="Headline (optional)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <textarea
            rows={3}
            placeholder="Your review (optional)"
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit review"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-slate-500">Be the first to review.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {reviews.map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex items-center gap-2">
                <StarRating value={r.rating} readOnly size="sm" />
                <span className="text-sm font-medium">
                  {r.customerName ?? "Customer"}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(r.createdAt).toLocaleDateString("en-IN")}
                </span>
              </div>
              {r.title && <p className="mt-1 font-semibold">{r.title}</p>}
              {r.comment && (
                <p className="mt-1 text-sm text-slate-600">{r.comment}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
