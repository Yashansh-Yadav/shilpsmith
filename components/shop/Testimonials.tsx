"use client";

import { Quote } from "lucide-react";

import StarRating from "./StarRating";

export interface Testimonial {
  id: number;
  rating: number;
  title: string | null;
  comment: string | null;
  customerName: string | null;
  product: { name: string };
}

interface Props {
  reviews: Testimonial[];
}

export default function Testimonials({ reviews }: Props) {
  if (reviews.length === 0) return null;

  return (
    <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-6">
      {reviews.map((r) => (
        <article
          key={r.id}
          className="relative flex-none snap-start w-[300px] sm:w-[360px] rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lift"
        >
          <Quote
            className="absolute right-5 top-5 h-7 w-7 text-brand-100"
            strokeWidth={2}
          />
          <StarRating value={r.rating} readOnly size="sm" />
          {r.title && (
            <h3 className="mt-3 text-base font-bold leading-snug tracking-tight">
              {r.title}
            </h3>
          )}
          {r.comment && (
            <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-slate-600">
              {r.comment}
            </p>
          )}
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
            <p className="text-sm font-medium text-slate-900">
              {r.customerName ?? "Customer"}
            </p>
            <p className="text-xs text-slate-500">on {r.product.name}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
