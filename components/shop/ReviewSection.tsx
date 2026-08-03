"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import StarRating from "./StarRating";

export interface ReviewItem {
  id: number;
  rating: number;
  title: string | null;
  comment: string | null;
  customerName: string | null;
  createdAt: string;
}

export interface ReviewSummary {
  average: number;
  count: number;
}

/** Approved-review counts keyed by star (1–5). */
export type ReviewDistribution = Record<number, number>;

interface Props {
  productId: number;
  /**
   * Server-rendered starting data. When present the section paints complete on
   * first byte (and the ratings land in the crawled HTML) instead of flashing a
   * "Loading reviews…" state. Omit it and the section self-fetches as before.
   */
  initialReviews?: ReviewItem[];
  initialSummary?: ReviewSummary;
  initialDistribution?: ReviewDistribution;
  /** Compact heading, for embedding somewhere other than a product page. */
  compact?: boolean;
}

const EMPTY_DISTRIBUTION: ReviewDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

// Reviews shown before the "Show all" toggle. Long lists otherwise push the
// related-products shelf off the bottom of a long product page.
const VISIBLE_REVIEWS = 5;

export default function ReviewSection({
  productId,
  initialReviews,
  initialSummary,
  initialDistribution,
  compact = false,
}: Props) {
  const seeded = initialReviews != null && initialSummary != null;

  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews ?? []);
  const [summary, setSummary] = useState<ReviewSummary>(
    initialSummary ?? { average: 0, count: 0 }
  );
  const [distribution, setDistribution] = useState<ReviewDistribution>(
    initialDistribution ?? EMPTY_DISTRIBUTION
  );
  const [loading, setLoading] = useState(!seeded);
  const [showAll, setShowAll] = useState(false);

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
        setDistribution(body.data.distribution ?? EMPTY_DISTRIBUTION);
      }
    } finally {
      setLoading(false);
    }
  }, [productId]);

  // Only fetch on mount when the server didn't hand us data. After a submit we
  // always refetch, so a moderated review shows up as soon as it's approved.
  useEffect(() => {
    if (seeded) return;
    load();
  }, [seeded, load]);

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

  const visible = showAll ? reviews : reviews.slice(0, VISIBLE_REVIEWS);

  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-4">
        {compact ? (
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Reviews
          </h3>
        ) : (
          <h2 className="text-xl font-black tracking-tight">
            Ratings &amp; reviews
          </h2>
        )}
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
        >
          {showForm ? "Cancel" : "Write a review"}
        </button>
      </div>

      {/* Score + per-star breakdown */}
      <div className="mb-6 flex flex-col gap-6 rounded-3xl border border-slate-100 bg-white p-5 sm:flex-row sm:items-center sm:gap-10">
        <div className="shrink-0 text-center sm:text-left">
          <p className="font-spec text-4xl font-black leading-none text-slate-900">
            {summary.count > 0 ? summary.average.toFixed(1) : "—"}
          </p>
          <div className="mt-2">
            <StarRating value={summary.average} readOnly size="sm" />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {summary.count > 0
              ? `${summary.count} verified review${summary.count > 1 ? "s" : ""}`
              : "No reviews yet"}
          </p>
        </div>

        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const n = distribution[star] ?? 0;
            // Percentages are of the total so the bars stay comparable; a zero
            // count renders an empty track rather than disappearing.
            const pct = summary.count > 0 ? (n / summary.count) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-3 text-xs">
                <span className="w-8 shrink-0 text-slate-500">{star}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-slate-400">{n}</span>
              </div>
            );
          })}
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 space-y-3 rounded-3xl border border-slate-200 p-5"
        >
          <p className="text-xs text-slate-500">
            Reviews are restricted to verified buyers — use the email you placed
            your order with.
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
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit review"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-slate-500">
          Be the first to review this product.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {visible.map((r) => (
              <li key={r.id} className="py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StarRating value={r.rating} readOnly size="sm" />
                  <span className="text-sm font-semibold text-slate-900">
                    {r.customerName ?? "Customer"}
                  </span>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-700">
                    Verified buyer
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
                {r.title && (
                  <p className="mt-1.5 font-semibold text-slate-900">{r.title}</p>
                )}
                {r.comment && (
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {r.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>

          {reviews.length > VISIBLE_REVIEWS && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-4 text-sm font-semibold text-brand-700 transition hover:text-brand-800 hover:underline"
            >
              {showAll
                ? "Show fewer reviews"
                : `Show all ${reviews.length} reviews`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
