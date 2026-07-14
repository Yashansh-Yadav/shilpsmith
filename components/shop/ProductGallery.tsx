"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import ProductImage from "./ProductImage";

interface Props {
  images: { url: string }[];
  productName: string;
  productId?: number | string;
}

// Product-preview image gallery: a large, non-cropped main image (object-contain
// on a neutral backdrop so portrait pieces like idols aren't zoomed/cut off) plus
// a thumbnail strip when there's more than one image. Falls back to the branded
// ProductImage placeholder when the product has no images.
//
// Clicking the main image opens a full-screen lightbox so customers can inspect
// the piece at full resolution (close via the button, backdrop click, or Escape).
export default function ProductGallery({
  images,
  productName,
  productId,
}: Props) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Reset to the cover image whenever a different product is shown.
  useEffect(() => {
    setActive(0);
    setLightboxOpen(false);
  }, [productId]);

  const hasImages = images.length > 0;
  const safeActive = Math.min(active, Math.max(0, images.length - 1));
  const mainUrl = hasImages ? images[safeActive]?.url : undefined;

  // Close the lightbox on Escape and lock body scroll while it's open.
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen]);

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      {/* Main image */}
      {mainUrl ? (
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          aria-label={`View ${productName} full size`}
          className="group block cursor-zoom-in overflow-hidden rounded-3xl bg-slate-50 ring-1 ring-slate-100 transition hover:ring-slate-200"
        >
          <ProductImage
            src={mainUrl}
            alt={productName}
            productId={productId}
            aspectClass="aspect-square"
            fit="contain"
          />
        </button>
      ) : (
        <div className="overflow-hidden rounded-3xl bg-slate-50 ring-1 ring-slate-100">
          <ProductImage
            src={mainUrl}
            alt={productName}
            productId={productId}
            aspectClass="aspect-square"
            fit="contain"
            caption={productName}
          />
        </div>
      )}

      {/* Thumbnails — only when there's a real gallery to navigate */}
      {images.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <button
              key={`${img.url}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === safeActive}
              className={`h-16 w-16 flex-none overflow-hidden rounded-xl bg-slate-50 ring-2 transition ${
                i === safeActive
                  ? "ring-brand-600"
                  : "ring-transparent hover:ring-slate-300"
              }`}
            >
              <img
                src={img.url}
                alt={`${productName} thumbnail ${i + 1}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Full-size lightbox */}
      {lightboxOpen && mainUrl && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm sm:p-8"
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} full size image`}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close full size image"
            className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-slate-800 shadow-lg transition hover:bg-white"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={mainUrl}
            alt={productName}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full cursor-default rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
