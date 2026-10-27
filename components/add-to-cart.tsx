"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { addItem } from "@/lib/store/slices/cartSlice";
import type { StoreProduct } from "@/lib/catalog";
import { useMounted } from "@/lib/use-mounted";

type CartProduct = Pick<StoreProduct, "id" | "title" | "price" | "mrp" | "stock">;

export function AddToCart({ product, buyNow = false }: { product: CartProduct; buyNow?: boolean }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const inCart = useAppSelector((s) => s.cart.items.find((i) => i.id === product.id));
  const mounted = useMounted();

if (product.stock < 1) {
  return (
    <Button disabled className="h-9 min-w-0 flex-1">
      Out of stock
    </Button>
  );
}

  const put = () =>
    dispatch(addItem({ id: product.id, title: product.title, price: product.price, mrp: product.mrp, stock: product.stock }));

  const add = () => {
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

  return (
    <div className="flex w-full gap-2">
      <Button onClick={add} variant={buyNow ? "outline" : "default"} className="h-9 flex-1">
        <ShoppingCart aria-hidden />
        {mounted && inCart ? `In cart (${inCart.qty})` : "Add to cart"}
      </Button>
      {buyNow && (
        <Button
          className="h-9 flex-1"
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