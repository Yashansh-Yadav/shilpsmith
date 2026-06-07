"use client";

import { useEffect, useState } from "react";

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
export default function ProductGallery({
  images,
  productName,
  productId,
}: Props) {
  const [active, setActive] = useState(0);

  // Reset to the cover image whenever a different product is shown.
  useEffect(() => {
    setActive(0);
  }, [productId]);

  const hasImages = images.length > 0;
  const safeActive = Math.min(active, Math.max(0, images.length - 1));
  const mainUrl = hasImages ? images[safeActive]?.url : undefined;

  return (
    <div className="flex flex-col gap-3 p-3 sm:p-4">
      {/* Main image */}
      <div className="overflow-hidden rounded-3xl bg-slate-50 ring-1 ring-slate-100">
        <ProductImage
          src={mainUrl}
          alt={productName}
          productId={productId}
          aspectClass="aspect-square"
          fit="contain"
          caption={mainUrl ? undefined : productName}
        />
      </div>

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
    </div>
  );
}
