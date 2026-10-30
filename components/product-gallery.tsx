"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { categoryIcons } from "@/components/category-icon";
import { imageSrc } from "@/lib/product-image";
import { discountPct } from "@/lib/products";
import type { StoreProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function ProductGallery({ product }: { product: StoreProduct }) {
  const images: string[] =
    product.images && product.images.length > 0
      ? product.images
      : product.imageUrl
      ? [product.imageUrl]
      : [];

  const [activeIndex, setActiveIndex] = useState(0);

  const prevImage = () => {
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const nextImage = () => {
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const currentImage = images[activeIndex];
  const discount = discountPct(product);
  const Icon = categoryIcons[product.category];

  return (
    <div className="space-y-3 mx-auto w-full max-w-[420px] md:sticky md:top-20 md:self-start">
      {/* Main Large Image Container */}
      <div className="group relative flex aspect-square max-h-[440px] w-full items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 to-primary/[0.03] text-primary/60 shadow-xs">
        {currentImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc(currentImage, 1000)}
            alt={`${product.title} - Photo ${activeIndex + 1}`}
            loading="eager"
            decoding="async"
            className="size-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Icon className="size-24" aria-hidden />
        )}

        {/* Discount Badge */}
        {discount > 0 && (
          <span className="absolute top-3 right-3 rounded-md bg-[#fcc618] px-2 py-0.5 text-xs font-black text-black shadow-xs">
            {discount}% off
          </span>
        )}

        {/* Left / Right Navigation Arrows (only if multiple images) */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={prevImage}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 grid size-9 place-items-center rounded-full bg-background/80 text-foreground backdrop-blur-sm shadow-md transition-all opacity-0 group-hover:opacity-100 hover:bg-background focus-visible:opacity-100"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={nextImage}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 grid size-9 place-items-center rounded-full bg-background/80 text-foreground backdrop-blur-sm shadow-md transition-all opacity-0 group-hover:opacity-100 hover:bg-background focus-visible:opacity-100"
            >
              <ChevronRight className="size-5" />
            </button>

            {/* Photo Counter */}
            <span className="absolute bottom-3 right-3 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {activeIndex + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {/* Thumbnail Bar (Only shown if more than 1 image) */}
      {images.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-1" role="tablist" aria-label="Product thumbnails">
          {images.map((img, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={`${img}-${idx}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveIndex(idx)}
                className={cn(
                  "relative aspect-square size-14 sm:size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary ring-2 ring-primary/30 opacity-100 scale-102"
                    : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageSrc(img, 200)}
                  alt={`${product.title} thumbnail ${idx + 1}`}
                  loading="lazy"
                  className="size-full object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

