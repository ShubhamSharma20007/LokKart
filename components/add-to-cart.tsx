"use client";

import { useRouter } from "next/navigation";
import { Check, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { addItem } from "@/lib/store/slices/cartSlice";
import type { StoreProduct } from "@/lib/catalog";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

type CartProduct = Pick<StoreProduct, "id" | "title" | "price" | "mrp" | "stock">;

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
  const inCart = useAppSelector((s) => s.cart.items.find((i) => i.id === product.id));
  const mounted = useMounted();

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

  const put = () =>
    dispatch(addItem({ id: product.id, title: product.title, price: product.price, mrp: product.mrp, stock: product.stock }));

  const add = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inCart && inCart.qty >= product.stock) {
      toast.info("You have all the available stock in your cart.", { id: `max-${product.id}` });
      return;
    }
    put();
    toast.success("Added to cart", {
      id: `add-${product.id}`,
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
        {mounted && inCart ? `In cart (${inCart.qty})` : "Add to cart"}
      </Button>
      {buyNow && (
        <Button
          className={cn("flex-1", compact ? "h-8 text-xs rounded-lg" : "h-9")}
          onClick={() => {
            if (!inCart) put();
            router.push("/checkout");
          }}
        >
          Buy now
        </Button>
      )}
    </div>
  );
}
