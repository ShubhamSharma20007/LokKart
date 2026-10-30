import Link from "next/link";
import { AddToCart } from "@/components/add-to-cart";
import { ProductImage } from "@/components/product-image";
import { discountPct, formatINR } from "@/lib/products";
import type { StoreProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function ProductCard({ product }: { product: StoreProduct }) {
  const href = `/products/${product.id}`;
  const discount = discountPct(product);

  return (
    <div className="group flex h-full flex-col justify-between overflow-hidden rounded-xl border border-border/50 bg-card shadow-xs transition-shadow hover:shadow-md">
      {/* Top Image Container: Reduced compact fixed height */}
      <Link href={href} aria-label={product.title} tabIndex={-1} className="block relative">
        <div className="relative flex h-36 sm:h-40 w-full items-center justify-center overflow-hidden bg-muted/20">
          <ProductImage
            product={product}
            width={400}
            className={cn(
              "size-full object-contain transition-transform duration-300 group-hover:scale-105",
              product.stock < 1 && "opacity-50 grayscale"
            )}
            iconClassName="size-10 transition-transform group-hover:scale-110 text-muted-foreground"
          />
          {/* Category Badge Top Left */}
          <span className="absolute top-1.5 left-1.5 rounded-md bg-slate-900/80 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium text-white backdrop-blur-xs">
            {product.category}
          </span>
          {/* Discount Badge Top Right */}
          <span className="absolute top-1.5 right-1.5 rounded-md bg-[#fcc618] px-1.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold text-black shadow-xs">
            {discount > 0 ? `${discount}% off` : "0% off"}
          </span>
        </div>
      </Link>

      {/* Content Area */}
      <div className="p-2.5 space-y-1.5 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <Link
            href={href}
            className="line-clamp-2 h-8 font-heading text-xs font-semibold leading-snug text-foreground hover:underline"
          >
            {product.title}
          </Link>
          <div className="flex items-baseline justify-between gap-1 pt-0.5">
            <span className="font-heading text-base sm:text-lg font-black tracking-tight text-foreground">
              {formatINR(product.price)}
            </span>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground line-through font-medium">
              {formatINR(product.mrp)}
            </span>
          </div>
          <div>
            {product.stock > 0 ? (
              product.stock <= 20 ? (
                <span className="inline-block rounded-full bg-[#fcc618] px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-black">
                  Only {product.stock} left
                </span>
              ) : (
                <span className="inline-block rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-emerald-400">
                  In stock
                </span>
              )
            ) : (
              <span className="inline-block rounded-full bg-rose-500/15 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-rose-400">
                Out of stock
              </span>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <Link
            href={href}
            className="h-7 rounded-lg border border-input bg-background/50 px-2 text-[10px] sm:text-[11px] font-semibold text-foreground hover:bg-muted flex items-center justify-center transition-colors"
          >
            Details
          </Link>
          <div className="flex-1">
            <AddToCart product={product} compact />
          </div>
        </div>
      </div>
    </div>
  );
}
