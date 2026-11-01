"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { addItem } from "@/lib/store/slices/cartSlice";
import type { StoreProduct } from "@/lib/catalog";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

type CartProduct = Pick<StoreProduct, "id" | "title" | "price" | "mrp" | "stock"> & {
  sizes?: string[];
  colors?: string[];
};

export function AddToCart({
  product,
  buyNow = false,
  compact = false,
  iconOnly = false,
}: {
  product: CartProduct;
  buyNow?: boolean;
  compact?: boolean;
  iconOnly?: boolean;
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const mounted = useMounted();
  const hasSizes = !!product.sizes && product.sizes.length > 0;
  const hasColors = !!product.colors && product.colors.length > 0;
  const hasVariants = hasSizes || hasColors;
  
  // Default to first size if available on detail page, or let user pick
  const [selectedSize, setSelectedSize] = useState<string | null>(
    hasSizes ? product.sizes![0] : null
  );

  const cartItemId = selectedSize ? `${product.id}-${selectedSize}` : product.id;
  const inCart = useAppSelector((s) => s.cart.items.find((i) => i.id === cartItemId));

  if (product.stock < 1) {
    if (iconOnly) {
      return (
        <button
          type="button"
          disabled
          aria-label="Out of stock"
          className="size-10 shrink-0 grid place-items-center rounded-xl bg-muted text-muted-foreground/50 cursor-not-allowed opacity-60"
        >
          <ShoppingCart className="size-4" />
        </button>
      );
    }
    return (
      <Button disabled className={cn("min-w-0 flex-1 opacity-60", compact ? "h-7 sm:h-8 text-[11px] sm:text-xs rounded-lg px-2" : "h-9")}>
        Out of stock
      </Button>
    );
  }

  const put = (sizeToUse: string | null = selectedSize) => {
    const id = sizeToUse ? `${product.id}-${sizeToUse}` : product.id;
    dispatch(
      addItem({
        id,
        productId: product.id,
        title: product.title,
        price: product.price,
        mrp: product.mrp,
        stock: product.stock,
        size: sizeToUse || undefined,
      })
    );
  };

  const add = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If on listing / compact card and product has variants (sizes or colors), direct user to detail page to pick
    if ((compact || iconOnly) && hasVariants) {
      router.push(`/products/${product.id}`);
      return;
    }

    if (hasSizes && !selectedSize) {
      toast.error("Please select a size first");
      return;
    }

    if (inCart && inCart.qty >= product.stock) {
      toast.info("You have all the available stock in your cart.", { id: `max-${product.id}` });
      return;
    }

    put();
    toast.success(selectedSize ? `Added to cart (Size: ${selectedSize})` : "Added to cart", {
      id: `add-${cartItemId}`,
      description: product.title,
      action: { label: "View cart", onClick: () => router.push("/cart") },
    });
  };

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={add}
        aria-label={`Add ${product.title} to cart`}
        className={cn(
          "size-10 shrink-0 grid place-items-center rounded-xl text-white shadow-sm transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          mounted && inCart
            ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
            : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/25"
        )}
      >
        {mounted && inCart ? <Check className="size-4 stroke-[2.5]" /> : <ShoppingCart className="size-4" />}
      </button>
    );
  }

  return (
    <div className="w-full space-y-3">
      {/* Size Picker for Product Detail View */}
      {!compact && hasSizes && (
        <div className="space-y-2 pt-1 pb-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              Select Size:{" "}
              <strong className="text-primary font-bold">{selectedSize || "Please select"}</strong>
            </span>
            <span className="text-[11px] text-muted-foreground">Standard regular fit</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {product.sizes!.map((s) => {
              const isSelected = selectedSize === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSize(s)}
                  className={cn(
                    "h-9 min-w-11 px-3 rounded-lg text-xs font-bold transition-all border select-none",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/20 shadow-xs scale-102"
                      : "border-border bg-card hover:border-primary/50 hover:bg-muted text-foreground"
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex w-full gap-2">
        <Button
          onClick={add}
          variant={buyNow ? "outline" : "default"}
          className={cn(
            "flex-1 font-semibold",
            compact
              ? "h-7 sm:h-8 text-[11px] sm:text-xs rounded-lg bg-foreground text-background hover:bg-foreground/90 gap-1 px-2 sm:px-2.5 whitespace-nowrap"
              : "h-9"
          )}
        >
          <ShoppingCart className={compact ? "size-3.5" : "size-4"} aria-hidden />
          {mounted && inCart
            ? `In cart (${inCart.qty})`
            : compact && hasVariants
            ? "Select"
            : "Add to cart"}
        </Button>
        {buyNow && (
          <Button
            className={cn("flex-1", compact ? "h-8 text-xs rounded-lg" : "h-9")}
            onClick={() => {
              if (hasSizes && !selectedSize) {
                toast.error("Please select a size first");
                return;
              }
              if (!inCart) put();
              router.push("/checkout");
            }}
          >
            Buy now
          </Button>
        )}
      </div>
    </div>
  );
}
