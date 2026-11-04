import Link from "next/link";
import { Star } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { discountPct, formatINR } from "@/lib/products";
import type { StoreProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";

// Deterministic rating for products to match Figma (e.g., 4.5/5, 5.0/5, 3.5/5)
function getProductRating(id: string): number {
  const ratings = [4.5, 5.0, 3.5, 4.0, 4.5, 5.0];
  let sum = 0;
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i);
  return ratings[sum % ratings.length];
}

// 5-Star rating component matching Shop.co Figma style
function StarRating({ rating = 4.5 }: { rating?: number }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-1.5 pt-0.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "size-3.5 sm:size-4",
              i < full
                ? "fill-[#FFC633] text-[#FFC633]"
                : half && i === full
                ? "fill-[#FFC633]/60 text-[#FFC633]"
                : "fill-[#E0E0E0] text-[#E0E0E0]"
            )}
            aria-hidden
          />
        ))}
      </div>
      <span className="text-xs sm:text-sm text-black/60 font-normal">
        {rating.toFixed(1)}
        <span className="text-black/40">/5</span>
      </span>
    </div>
  );
}

export function ProductCard({
  product,
  rating,
}: {
  product: StoreProduct;
  rating?: number;
}) {
  const href = `/products/${product.id}`;
  const discount = discountPct(product);
  const productRating = rating ?? getProductRating(product.id);

  return (
    <Link href={href} className="group block cursor-pointer select-none">
      {/* ── Image box with soft #F0EEED rounded background ── */}
      <div className="relative aspect-square w-full overflow-hidden rounded-[20px] bg-[#F0EEED] p-4 sm:p-6 flex items-center justify-center transition-transform duration-300 group-hover:scale-[1.02]">
        <ProductImage
          product={product}
          width={400}
          className={cn(
            "size-full object-contain transition-transform duration-300 group-hover:scale-105",
            product.stock < 1 && "opacity-50 grayscale"
          )}
          iconClassName="size-16 text-black/20"
        />

        {/* Out of stock badge if stock is 0 */}
        {product.stock < 1 && (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-xs">
            Out of stock
          </span>
        )}
      </div>

      {/* ── Details below image (Clean Shop.co typography) ── */}
      <div className="mt-3.5 space-y-1">
        {/* Product Title */}
        <h3 className="font-heading text-sm sm:text-base font-bold text-black truncate leading-snug group-hover:underline">
          {product.title}
        </h3>

        {/* Star Rating */}
        <StarRating rating={productRating} />

        {/* Price Row: Bold Price + Strikethrough MRP + Soft Red Discount Badge */}
        <div className="flex items-center gap-2 sm:gap-2.5 pt-0.5">
          <span className="font-heading text-lg sm:text-xl font-bold text-black tracking-tight">
            {formatINR(product.price)}
          </span>

          {discount > 0 && (
            <>
              <span className="text-sm sm:text-base font-bold text-black/40 line-through">
                {formatINR(product.mrp)}
              </span>

              <span className="rounded-full bg-[#FF3333]/10 px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-bold text-[#FF3333]">
                -{discount}%
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
