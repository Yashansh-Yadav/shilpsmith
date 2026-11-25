"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquarePlus, PenLine, Quote, ShieldCheck, Star } from "lucide-react";
import toast from "react-hot-toast";

import StarRating from "./StarRating";
import ReviewModal from "./ReviewModal";

export interface ReviewItem {
  id: number;
  rating: number;
  title: string | null;
  comment: string | null;
  customerName: string | null;
  /** Purchase confirmed via order number + email — drives the badge. */
  verified: boolean;
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
  productName?: string;
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
const VISIBLE_REVIEWS = 4;

// Deterministic avatar tint per reviewer — same name always gets the same chip.
const AVATAR_TINTS = [
  "bg-brand-100 text-brand-700",
  "bg-amber-100 text-amber-700",
  "bg-accent-50 text-accent-600",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
];

function initialsOf(name: string | null) {
  const clean = (name ?? "").trim();
  if (!clean) return "★";
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function tintFor(name: string | null) {
  const key = (name ?? "").trim();
  let sum = 0;
  for (let i = 0; i < key.length; i += 1) sum += key.charCodeAt(i);
  return AVATAR_TINTS[sum % AVATAR_TINTS.length];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ReviewSection({
  productId,
  productName,
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
  const [modalOpen, setModalOpen] = useState(false);

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
    } catch {
      // A failed refetch just leaves the current list on screen; the section is
      // never the primary content, so don't escalate it into an error state.
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

  const visible = showAll ? reviews : reviews.slice(0, VISIBLE_REVIEWS);
  const hasReviews = summary.count > 0;

  // Share of reviews that are 4★ or better — the one derived stat worth showing.
  const recommendPct = useMemo(() => {
    if (!hasReviews) return 0;
    const positive = (distribution[4] ?? 0) + (distribution[5] ?? 0);
    return Math.round((positive / summary.count) * 100);
  }, [distribution, summary.count, hasReviews]);

  function handleSubmitted() {
    toast.success("Review submitted — it'll appear once approved");
    load();
  }

  return (
    <section>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          {compact ? (
            <h3 className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
              Reviews
            </h3>
          ) : (
            <>
              <h2 className="font-display text-4xl font-semibold leading-none tracking-[-0.035em] text-slate-900 sm:text-5xl">
                Ratings &amp; reviews
              </h2>
              <p className="mt-4 text-lg text-slate-600">
                {hasReviews
                  ? `What ${summary.count} customer${
                      summary.count > 1 ? "s" : ""
                    } think about this piece`
                  : "Honest feedback from people who own it"}
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 font-semibold text-white transition hover:bg-slate-800 active:scale-[.97]"
        >
          <PenLine className="h-4 w-4" />
          Write a review
        </button>
      </div>

      {/* Score + per-star breakdown */}
      <div className="overflow-hidden rounded-[2rem] bg-white">
        <div className="flex flex-col gap-8 p-7 sm:flex-row sm:items-center sm:gap-12 sm:p-10">
          <div className="flex shrink-0 flex-col items-center text-center sm:w-44">
            <p className="font-display text-7xl font-semibold leading-none tracking-[-0.04em] text-slate-900">
              {hasReviews ? summary.average.toFixed(1) : "—"}
            </p>
            <div className="mt-3">
              <StarRating value={summary.average} readOnly size="md" />
            </div>
            <p className="mt-2 font-mono text-xs text-slate-500">
              {hasReviews
                ? `${summary.count} review${summary.count > 1 ? "s" : ""}`
                : "No reviews yet"}
            </p>
            {hasReviews && recommendPct > 0 && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                {recommendPct}% rated 4★+
              </p>
            )}
          </div>

          <div className="hidden w-px self-stretch bg-slate-200 sm:block" />

          <div className="flex-1 space-y-2.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = distribution[star] ?? 0;
              // Percentages are of the total so the bars stay comparable; a zero
              // count renders an empty track rather than disappearing.
              const pct = hasReviews ? (n / summary.count) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <span className="flex w-10 shrink-0 items-center gap-1 font-mono font-semibold text-slate-600">
                    {star}
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-[width] duration-700 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-7 shrink-0 text-right font-medium tabular-nums text-slate-500">
                    {n}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Review list */}
      <div className="mt-8">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-[1.75rem] bg-slate-200/70"
              />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-[2rem] bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <MessageSquarePlus className="h-7 w-7 text-slate-400" />
            </div>
            <p className="mt-4 font-display text-2xl font-semibold tracking-tight text-slate-900">
              No reviews yet
            </p>
            <p className="mx-auto mt-2 max-w-sm text-slate-600">
              Bought this one? Share how it turned out — you&apos;ll be the first
              review other shoppers see.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-400 to-brand-600 px-6 py-3.5 font-semibold text-slate-950 transition hover:brightness-110 active:scale-[.97]"
            >
              <PenLine className="h-4 w-4" />
              Be the first to review
            </button>
          </div>
        ) : (
          <>
            <ul className="grid gap-4 sm:grid-cols-2">
              {visible.map((r) => (
                <li
                  key={r.id}
                  className="group relative flex flex-col rounded-[1.75rem] bg-white p-6 transition hover:-translate-y-0.5"
                >
                  <Quote className="absolute right-6 top-6 h-6 w-6 text-brand-100" />

                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black ${tintFor(
                        r.customerName
                      )}`}
                      aria-hidden
                    >
                      {initialsOf(r.customerName)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display font-semibold text-slate-900">
                        {r.customerName ?? "Customer"}
                      </p>
                      {r.verified && (
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-brand-700">
                          <ShieldCheck className="h-3 w-3" />
                          Verified buyer
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <StarRating value={r.rating} readOnly size="sm" />
                    <span className="font-mono text-[11px] text-slate-400">
                      {formatDate(r.createdAt)}
                    </span>
                  </div>

                  {r.title && (
                    <p className="mt-3 font-display text-lg font-semibold leading-snug tracking-tight text-slate-900">
                      {r.title}
                    </p>
                  )}
                  {r.comment && (
                    <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
                      {r.comment}
                    </p>
                  )}
                </li>
              ))}
            </ul>

            {reviews.length > VISIBLE_REVIEWS && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="rounded-full bg-white px-6 py-3.5 font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:ring-slate-400"
                >
                  {showAll
                    ? "Show fewer reviews"
                    : `Show all ${reviews.length} reviews`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ReviewModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        productId={productId}
        productName={productName}
        onSubmitted={handleSubmitted}
      />
    </section>
  );
}
