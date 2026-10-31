import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { discountPct, formatINR } from "@/lib/products";
import type { StoreProduct } from "@/lib/catalog";

export function HeroProductCard({ product }: { product: StoreProduct }) {
  const href = `/products/${product.id}`;
  const discount = discountPct(product);
  const savings = product.mrp - product.price;

  return (
    <div className="relative group mx-auto w-full max-w-md">
      {/* Subtle ambient glow behind card */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-signal/20 to-primary/20 blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />

      {/* Card Container */}
      <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-background/85 backdrop-blur-xl shadow-2xl transition-all duration-300 group-hover:border-white/30 group-hover:-translate-y-1">
        {/* Header Tag */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-white/[0.04]">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-semibold tracking-wider uppercase text-brand-foreground/90 flex items-center gap-1">
              <Sparkles className="size-3 text-signal" />
              Latest Drop
            </span>
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-brand-foreground/90">
            {product.category}
          </span>
        </div>

        {/* Product Image Area */}
        <Link href={href} aria-label={product.title} className="block relative">
          <div className="relative flex h-56 sm:h-64 w-full items-center justify-center overflow-hidden bg-black/20 p-4">
            <ProductImage
              product={product}
              width={600}
              className="size-full object-contain transition-transform duration-500 group-hover:scale-105"
              iconClassName="size-20 text-brand-foreground/30"
            />
            {/* Discount Badge */}
            {discount > 0 && (
              <div className="absolute top-3 right-3 rounded-xl bg-signal px-3 py-1 font-heading text-xs font-black text-signal-foreground shadow-lg tracking-tight">
                {discount}% OFF
              </div>
            )}
          </div>
        </Link>

        {/* Content Area */}
        <div className="p-4 sm:p-5 space-y-3.5 bg-background/60">
          <div>
            <Link
              href={href}
              className="font-heading text-base sm:text-lg font-bold leading-snug text-foreground hover:text-signal transition-colors line-clamp-2"
            >
              {product.title}
            </Link>
          </div>

          {/* Pricing & Savings */}
          <div className="flex items-end justify-between gap-3 border-t border-border/40 pt-3">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  {formatINR(product.price)}
                </span>
                <span className="text-xs text-muted-foreground line-through font-medium">
                  MRP {formatINR(product.mrp)}
                </span>
              </div>
              {savings > 0 && (
                <p className="mt-0.5 text-[11px] font-semibold text-emerald-500 dark:text-emerald-400">
                  You save {formatINR(savings)} per piece
                </p>
              )}
            </div>

            {/* Action Button */}
            <Link
              href={href}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-signal px-3.5 text-xs font-bold text-signal-foreground shadow-sm transition-all hover:bg-signal/90 hover:gap-2 active:scale-95"
            >
              <span>View Deal</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

