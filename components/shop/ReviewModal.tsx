"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, CheckCircle2, Loader2, ShieldCheck, Star, X } from "lucide-react";
import toast from "react-hot-toast";

import StarRating, { RATING_LABELS } from "./StarRating";

interface Props {
  open: boolean;
  onClose: () => void;
  productId: number;
  productName?: string;
  /** Fired after a successful submit so the parent can refetch. */
  onSubmitted?: () => void;
}

type FieldErrors = Partial<
  Record<
    | "rating"
    | "customerName"
    | "customerEmail"
    | "orderNumber"
    | "title"
    | "comment",
    string
  >
>;

const COMMENT_MAX = 2000;
const TITLE_MAX = 200;

const EMPTY_FORM = {
  rating: 0,
  customerName: "",
  customerEmail: "",
  orderNumber: "",
  title: "",
  comment: "",
};

export default function ReviewModal({
  open,
  onClose,
  productId,
  productName,
  onSubmitted,
}: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [earnedBadge, setEarnedBadge] = useState(false);

  const firstFieldRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Reset every time the dialog is opened so a previous error or success state
  // never greets the next reviewer.
  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setErrors({});
    setFormError(null);
    setDone(false);
    setEarnedBadge(false);
    const t = setTimeout(() => firstFieldRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [open]);

  // Lock body scroll while open (same approach as CartSheet).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Escape to close + keep Tab inside the dialog.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function set<K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    // Client-side mirror of the server rules, so an obvious miss never costs a
    // request against the reviews rate limit.
    const next: FieldErrors = {};
    if (form.rating < 1) next.rating = "Pick a star rating";
    if (!form.customerName.trim()) next.customerName = "Tell us your name";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.customerEmail.trim()))
      next.customerEmail = "Enter the email you ordered with";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const title = form.title.trim();
    const comment = form.comment.trim();
    const orderNumber = form.orderNumber.trim();

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating: form.rating,
          customerEmail: form.customerEmail.trim(),
          customerName: form.customerName.trim(),
          ...(orderNumber ? { orderNumber } : {}),
          ...(title ? { title } : {}),
          ...(comment ? { comment } : {}),
        }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok || !body?.success) {
        const details: { field?: string; message: string }[] =
          body?.error?.details ?? [];
        const fieldErrors: FieldErrors = {};
        for (const d of details) {
          if (d.field && d.field in EMPTY_FORM) {
            fieldErrors[d.field as keyof FieldErrors] = d.message;
          }
        }
        setErrors(fieldErrors);
        setFormError(
          body?.error?.message ??
            "Could not submit your review. Please try again."
        );
        return;
      }

      setEarnedBadge(Boolean(body.data?.verified));
      setDone(true);
      onSubmitted?.();
    } catch {
      // Network / offline — without this the button would stay stuck on
      // "Submitting…" forever.
      setFormError("Network error — check your connection and try again.");
      toast.error("Could not reach the server");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-hidden
      />

      <div
        ref={panelRef}
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-4xl bg-white shadow-2xl animate-fade-in-up sm:max-h-[90vh] sm:max-w-lg sm:rounded-4xl"
      >
        {/* Header */}
        <div className="relative overflow-hidden rounded-t-4xl bg-gradient-to-br from-brand-600 via-brand-700 to-emerald-900 px-6 pb-8 pt-6 text-white">
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/15 p-1.5 text-white transition hover:bg-white/25"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-100">
            <Star className="h-3.5 w-3.5 fill-current" />
            Share your experience
          </p>
          <h2 id="review-modal-title" className="mt-2 text-2xl font-black leading-tight">
            {done ? "Thank you!" : "Write a review"}
          </h2>
          {productName && !done && (
            <p className="mt-1 truncate text-sm text-brand-100">{productName}</p>
          )}
        </div>

        {done ? (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50">
              <CheckCircle2 className="h-9 w-9 text-brand-600" />
            </div>
            <p className="mt-5 text-lg font-bold text-slate-900">
              Your review has been submitted
            </p>
            {earnedBadge && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                <BadgeCheck className="h-4 w-4" />
                Verified buyer badge unlocked
              </p>
            )}
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
              It&apos;s with our team for a quick check and will appear on this
              page once approved. Thanks for helping other shoppers.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded-full bg-slate-900 px-7 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
            <div className="flex items-start gap-2.5 rounded-2xl bg-slate-50 px-4 py-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <p className="text-xs leading-relaxed text-slate-600">
                Bought this in person or at an exhibition? You can still review
                it. Every review is read by our team before it goes live.
              </p>
            </div>

            {/* Rating */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-900">
                Your rating
              </label>
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                <StarRating
                  value={form.rating}
                  onChange={(r) => set("rating", r)}
                  size="lg"
                />
                <span className="text-sm font-semibold text-slate-600">
                  {form.rating > 0 ? RATING_LABELS[form.rating] : "Tap a star"}
                </span>
              </div>
              {errors.rating && <FieldError>{errors.rating}</FieldError>}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rv-name" className="mb-1.5 block text-sm font-semibold text-slate-900">
                  Your name
                </label>
                <input
                  id="rv-name"
                  ref={firstFieldRef}
                  type="text"
                  maxLength={80}
                  value={form.customerName}
                  onChange={(e) => set("customerName", e.target.value)}
                  placeholder="Riya S."
                  className={inputClass(!!errors.customerName)}
                />
                {errors.customerName && <FieldError>{errors.customerName}</FieldError>}
              </div>
              <div>
                <label htmlFor="rv-email" className="mb-1.5 block text-sm font-semibold text-slate-900">
                  Email
                </label>
                <input
                  id="rv-email"
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => set("customerEmail", e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass(!!errors.customerEmail)}
                />
                {errors.customerEmail && <FieldError>{errors.customerEmail}</FieldError>}
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Never published — we only use it to contact you.
                </p>
              </div>
            </div>

            {/* Optional proof of purchase. Order number + email together are
                something only the buyer has, which is what makes the badge
                worth trusting. */}
            <div className="rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 p-4">
              <label htmlFor="rv-order" className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <BadgeCheck className="h-4 w-4 text-brand-600" />
                Order number
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Ordered from this site? Add the number from your confirmation
                email to show a <strong className="font-semibold text-brand-700">Verified buyer</strong>{" "}
                badge on your review.
              </p>
              <input
                id="rv-order"
                type="text"
                maxLength={40}
                value={form.orderNumber}
                onChange={(e) => set("orderNumber", e.target.value)}
                placeholder="ORD-20260810-12345"
                className={`mt-2.5 ${inputClass(!!errors.orderNumber)} bg-white font-mono uppercase placeholder:font-sans placeholder:normal-case`}
              />
              {errors.orderNumber && <FieldError>{errors.orderNumber}</FieldError>}
            </div>

            <div>
              <label htmlFor="rv-title" className="mb-1.5 block text-sm font-semibold text-slate-900">
                Headline <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="rv-title"
                type="text"
                maxLength={TITLE_MAX}
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Beautiful finish, arrived early"
                className={inputClass(!!errors.title)}
              />
              {errors.title && <FieldError>{errors.title}</FieldError>}
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="rv-comment" className="text-sm font-semibold text-slate-900">
                  Your review <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <span className="text-[11px] tabular-nums text-slate-400">
                  {form.comment.length}/{COMMENT_MAX}
                </span>
              </div>
              <textarea
                id="rv-comment"
                rows={4}
                maxLength={COMMENT_MAX}
                value={form.comment}
                onChange={(e) => set("comment", e.target.value)}
                placeholder="What did you like? How was the quality, packaging and delivery?"
                className={`${inputClass(!!errors.comment)} resize-y`}
              />
              {errors.comment && <FieldError>{errors.comment}</FieldError>}
            </div>

            {formError && (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {formError}
              </p>
            )}

            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-7 py-3 text-sm font-bold text-white shadow-cta transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Submitting…" : "Submit review"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-2xl border px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:ring-2 ${
    hasError
      ? "border-rose-300 bg-rose-50/40 focus:border-rose-400 focus:ring-rose-100"
      : "border-slate-200 focus:border-brand-500 focus:ring-brand-100"
  }`;
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-xs font-medium text-rose-600">{children}</p>;
}
