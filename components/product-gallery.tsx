"use client";

import { useState } from "react";
import { imageSrc } from "@/lib/product-image";
import type { StoreProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function ProductGallery({
  product,
  activeIndex: controlledIndex,
  onIndexChange: controlledOnChange,
}: {
  product: StoreProduct;
  activeIndex?: number;
  onIndexChange?: (idx: number) => void;
}) {
  const rawImages: string[] =
    product.images && product.images.length > 0
      ? product.images
      : product.imageUrl
      ? [product.imageUrl]
      : [];

  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  const setActiveIndex = (idx: number) => {
    if (controlledOnChange) {
      controlledOnChange(idx);
    } else {
      setInternalIndex(idx);
    }
  };

  const currentImage = rawImages[activeIndex] || product.imageUrl;

  // Make sure we have 3 thumbnails to show in mobile & desktop grid
  let displayThumbnails = [...rawImages];
  if (displayThumbnails.length === 0 && product.imageUrl) {
    displayThumbnails = [product.imageUrl, product.imageUrl, product.imageUrl];
  } else if (displayThumbnails.length === 1) {
    displayThumbnails = [displayThumbnails[0], displayThumbnails[0], displayThumbnails[0]];
  } else if (displayThumbnails.length === 2) {
    displayThumbnails = [displayThumbnails[0], displayThumbnails[1], displayThumbnails[0]];
  }
  displayThumbnails = displayThumbnails.slice(0, 3);

  return (
    <div className="flex flex-col md:flex-row gap-3.5 sm:gap-4 w-full">
      {/* ── Main Large Image Box (On mobile: order-1 on top, on desktop: order-2 on right) ── */}
      <div className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-[#F0EEED] p-6 sm:p-10 flex items-center justify-center order-1 md:order-2 md:flex-1">
        {currentImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc(currentImage, 1000)}
            alt={product.title}
            className="size-full object-contain transition-transform duration-300"
          />
        ) : (
          <div className="size-32 rounded-xl bg-black/5" />
        )}
      </div>

      {/* ── 3 Thumbnails (On mobile: order-2 below main photo in 3-col grid, on desktop: order-1 vertical column on left) ── */}
      <div className="grid grid-cols-3 md:flex md:flex-col gap-3 sm:gap-3.5 shrink-0 order-2 md:order-1 w-full md:w-auto">
        {displayThumbnails.map((img, idx) => {
          const isActive = idx === (activeIndex % displayThumbnails.length);
          return (
            <button
              key={`${img}-${idx}`}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`View photo ${idx + 1}`}
              className={cn(
                "relative aspect-square w-full md:w-[130px] lg:w-[140px] md:h-[130px] lg:h-[140px] overflow-hidden rounded-[16px] sm:rounded-[20px] bg-[#F0EEED] p-2.5 sm:p-3 transition-all cursor-pointer flex items-center justify-center select-none",
                isActive
                  ? "border-2 border-black shadow-xs scale-[1.02]"
                  : "border-2 border-transparent hover:border-black/20 opacity-80 hover:opacity-100"
              )}
            >
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSrc(img, 240)}
                  alt=""
                  className="size-full object-contain"
                />
              ) : (
                <div className="size-full bg-black/5 rounded-lg" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
