"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Check, Minus, Plus, Ruler } from "lucide-react";
import { toast } from "sonner";
import { ProductGallery } from "@/components/product-gallery";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { addItem } from "@/lib/store/slices/cartSlice";
import { discountPct, formatINR, getColorHex } from "@/lib/products";
import type { StoreProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";

// 5-Star rating row
function RatingStars({
  rating,
  total,
  onReviewsClick,
}: {
  rating: number;
  total: number;
  onReviewsClick?: () => void;
}) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;

  return (
    <button
      type="button"
      onClick={onReviewsClick}
      className="flex items-center gap-2 group cursor-pointer text-left"
    >
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "size-4 sm:size-4.5",
              total > 0 && i < full
                ? "fill-[#FFC633] text-[#FFC633]"
                : total > 0 && half && i === full
                  ? "fill-[#FFC633]/60 text-[#FFC633]"
                  : "fill-[#E0E0E0] text-[#E0E0E0]"
            )}
            aria-hidden
          />
        ))}
      </div>
      <span className="text-xs sm:text-sm text-black/70 font-medium group-hover:text-black transition-colors">
        {total > 0 ? (
          <>
            {rating.toFixed(1)}
            <span className="text-black/40">/5</span>{" "}
            <span className="text-black/40 text-xs">({total})</span>
          </>
        ) : (
          <span className="text-black/50 text-xs">No reviews yet</span>
        )}
      </span>
    </button>
  );
}

export function ProductDetailView({ product }: { product: StoreProduct }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const defaultSizes = ["Small", "Medium", "Large", "X-Large"];
  const availableSizes =
    product.sizes && product.sizes.length > 0 ? product.sizes : defaultSizes;

  const defaultColors = ["Black", "Olive Green", "Charcoal"];
  const availableColors =
    product.colors && product.colors.length > 0 ? product.colors : defaultColors;

  const [selectedSize, setSelectedSize] = useState<string>(availableSizes[0]);
  const [selectedColor, setSelectedColor] = useState<string>(availableColors[0]);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Dynamic reviews rating state
  const [avgRating, setAvgRating] = useState<number>(0);
  const [reviewsTotal, setReviewsTotal] = useState<number>(0);

  useEffect(() => {
    async function loadRating() {
      try {
        const res = await fetch(`/api/reviews/${encodeURIComponent(product.id)}`);
        if (res.ok) {
          const data = await res.json();
          setAvgRating(data.averageRating || 0);
          setReviewsTotal(data.total || 0);
        }
      } catch {
        // silent fallback
      }
    }
    loadRating();
  }, [product.id]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrollToReviews = () => {
    const el = document.getElementById("reviews-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const discount = discountPct(product);

  const cartItemId = `${product.id}-${selectedColor}-${selectedSize}`;
  const cartItem = useAppSelector((s) =>
    s.cart.items.find((i) => i.id === cartItemId)
  );
  const inCart = mounted ? cartItem : undefined;

  const handleAddToCart = () => {
    if (product.stock < 1) {
      toast.error("This product is currently out of stock");
      return;
    }

    dispatch(
      addItem({
        id: cartItemId,
        productId: product.id,
        title: product.title,
        price: product.price,
        mrp: product.mrp,
        stock: product.stock,
        color: selectedColor,
        size: selectedSize,
        imageUrl: product.imageUrl ?? undefined,
      })
    );

    toast.success("Added to cart", {
      description: `${product.title} (${selectedColor}, ${selectedSize})`,
      action: { label: "View Cart", onClick: () => router.push("/cart") },
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
      {/* ── Left Column: Shop.co Gallery (Mobile: Main top + 3 thumbs below | Desktop: 3 thumbs left + Main right) ── */}
      <ProductGallery
        product={product}
        activeIndex={activeImageIndex}
        onIndexChange={setActiveImageIndex}
      />

      {/* ── Right Column: Clean Shop.co Product Details ── */}
      <div className="flex flex-col">
        {/* Title */}
        <h1 className="font-heading text-2xl sm:text-3xl lg:text-[40px] font-black uppercase tracking-tight text-black leading-tight">
          {product.title}
        </h1>

        {/* Dynamic Rating */}
        <div className="mt-2.5 sm:mt-3 flex items-center gap-3">
          <RatingStars
            rating={avgRating}
            total={reviewsTotal}
            onReviewsClick={scrollToReviews}
          />
        </div>

        {/* Price Row: Bold Price + Strikethrough MRP + Red Discount Pill */}
        <div className="mt-3.5 sm:mt-4 flex items-center gap-3 sm:gap-4">
          <span className="font-heading text-2xl sm:text-3xl lg:text-[32px] font-bold text-black tracking-tight">
            {formatINR(product.price)}
          </span>

          {product.mrp > product.price && (
            <>
              <span className="font-heading text-2xl sm:text-3xl lg:text-[32px] font-bold text-black/40 line-through">
                {formatINR(product.mrp)}
              </span>

              <span className="rounded-full bg-[#FF3333]/10 px-3 py-0.5 text-xs sm:text-sm font-bold text-[#FF3333]">
                -{discount}%
              </span>
            </>
          )}
        </div>

        {/* Description */}
        <p className="mt-4 sm:mt-5 text-sm sm:text-base text-black/60 leading-relaxed font-normal">
          {product.description ||
            "This graphic t-shirt which is perfect for any occasion. Crafted from a soft and breathable fabric, it offers superior comfort and style."}
        </p>

        <hr className="border-black/10 my-5 sm:my-6" />

        {/* ── Select Colors ── */}
        <div className="space-y-2.5 sm:space-y-3">
          <p className="text-xs sm:text-sm text-black/60 font-medium">Select Colors</p>
          <div className="flex flex-wrap items-center gap-3 sm:gap-3.5">
            {availableColors.map((colorName, idx) => {
              const hex = getColorHex(colorName);
              const isSelected = selectedColor === colorName;
              return (
                <button
                  key={colorName}
                  type="button"
                  onClick={() => {
                    setSelectedColor(colorName);
                    if (product.images && product.images.length > idx) {
                      setActiveImageIndex(idx);
                    }
                  }}
                  aria-label={`Select color ${colorName}`}
                  style={{ backgroundColor: hex }}
                  className={cn(
                    "grid size-9 sm:size-10 place-items-center rounded-full transition-transform cursor-pointer relative border border-black/10 shadow-2xs hover:scale-105",
                    isSelected && "ring-2 ring-black ring-offset-2 scale-105"
                  )}
                >
                  {isSelected && <Check className="size-4 text-white stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>

        <hr className="border-black/10 my-5 sm:my-6" />

        {/* ── Choose Size ── */}
        <div className="space-y-2.5 sm:space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs sm:text-sm text-black/60 font-medium">Choose Size</p>
            <Dialog >
              <DialogTrigger className="inline-flex items-center gap-1.5 text-xs text-black/70 hover:text-black underline underline-offset-4 cursor-pointer font-medium">
                <Ruler className="size-3.5" />
                <span>Size Guide</span>
              </DialogTrigger>
              <DialogContent className="max-w-lg bg-white p-6 rounded-3xl border border-black/10">
                <DialogHeader>
                  <DialogTitle className="font-heading text-lg font-bold text-black flex items-center gap-2">
                    <Ruler className="size-5" />
                    Size Guide (Regular Fit)
                  </DialogTitle>
                </DialogHeader>
                <div className="mt-3 overflow-hidden rounded-xl border border-black/10">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-[#F0F0F0] text-black font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Size</th>
                        <th className="py-2.5 px-3">Chest</th>
                        <th className="py-2.5 px-3">Length</th>
                        <th className="py-2.5 px-3">Shoulder</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5 text-black/80 font-medium">
                      <tr>
                        <td className="py-2 px-3 font-bold text-black">S (Small)</td>
                        <td className="py-2 px-3">38" (96 cm)</td>
                        <td className="py-2 px-3">27" (68 cm)</td>
                        <td className="py-2 px-3">16.5"</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-black">M (Medium)</td>
                        <td className="py-2 px-3">40" (101 cm)</td>
                        <td className="py-2 px-3">28" (71 cm)</td>
                        <td className="py-2 px-3">17.5"</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-black">L (Large)</td>
                        <td className="py-2 px-3">42" (106 cm)</td>
                        <td className="py-2 px-3">29" (73 cm)</td>
                        <td className="py-2 px-3">18.5"</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-black">XL (X-Large)</td>
                        <td className="py-2 px-3">44" (111 cm)</td>
                        <td className="py-2 px-3">30" (76 cm)</td>
                        <td className="py-2 px-3">19.5"</td>
                      </tr>
                      <tr>
                        <td className="py-2 px-3 font-bold text-black">XXL</td>
                        <td className="py-2 px-3">46" (116 cm)</td>
                        <td className="py-2 px-3">31" (78 cm)</td>
                        <td className="py-2 px-3">20.5"</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-[11px] sm:text-xs text-black/50">
                  Tip: All measurements are in standard regular fit. If you prefer a loose or oversized look, choose one size up.
                </p>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {availableSizes.map((size) => {
              const isSelected = selectedSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={cn(
                    "rounded-full px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-all cursor-pointer",
                    isSelected
                      ? "bg-black text-white shadow-xs"
                      : "bg-[#F0F0F0] text-black/60 hover:text-black hover:bg-black/10"
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>

        <hr className="border-black/10 my-5 sm:my-6" />

        {/* ── Quantity Stepper + Add to Cart Button (Mobile responsive single row) ── */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Quantity Stepper */}
          <div className="flex items-center justify-between gap-3 sm:gap-6 rounded-full bg-[#F0F0F0] px-4 sm:px-5 py-3 sm:py-4 shrink-0">
            <button
              type="button"
              aria-label="Decrease quantity"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="text-black/70 hover:text-black transition-colors"
            >
              <Minus className="size-4 sm:size-5" />
            </button>
            <span className="font-bold text-sm sm:text-base text-black select-none px-1">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              onClick={() => setQuantity((q) => Math.min(product.stock || 10, q + 1))}
              className="text-black/70 hover:text-black transition-colors"
            >
              <Plus className="size-4 sm:size-5" />
            </button>
          </div>

          {/* Add to Cart Black Pill */}
          <button
            type="button"
            suppressHydrationWarning
            onClick={handleAddToCart}
            disabled={product.stock < 1}
            className="flex-1 rounded-full bg-black py-3 sm:py-4 text-center text-xs sm:text-base font-semibold text-white hover:bg-black/85 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm truncate"
          >
            {product.stock < 1
              ? "Out of Stock"
              : inCart
                ? `In Cart (${inCart.qty})`
                : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
