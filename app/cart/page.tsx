"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CartSkeleton, EmptyCart } from "@/components/cart-states";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { removeItem, selectCount, selectHydrated, selectSubtotal, setQty } from "@/lib/store/slices/cartSlice";
import { formatINR } from "@/lib/products";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";

export default function CartPage() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.cart.items);
  const hydrated = useAppSelector(selectHydrated);
  const subtotal = useAppSelector(selectSubtotal);
  const count = useAppSelector(selectCount);
  const mounted = useMounted();
  const isReady = mounted && hydrated;
  const savings = items.reduce((n, i) => n + (i.mrp - i.price) * i.qty, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight">Your cart</h1>
        {isReady && count > 0 && <Badge variant="secondary" className="h-6 px-2.5 text-sm">{count} {count === 1 ? "item" : "items"}</Badge>}
      </div>

      {!isReady ? (
        <CartSkeleton />
      ) : items.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.id}>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-4">
                    <div className="min-w-0 flex-1">
                      <Link href={`/products/${i.id}`} className="font-medium hover:underline">{i.title}</Link>
                      <p className="text-sm text-muted-foreground">
                        {formatINR(i.price)} each <span className="line-through">{formatINR(i.mrp)}</span>
                      </p>
                      {i.qty >= i.stock && <p className="text-xs font-medium text-primary">Maximum available quantity</p>}
                    </div>
                    <div className="flex items-center gap-1" role="group" aria-label={`Quantity for ${i.title}`}>
                      <Button variant="outline" size="icon" aria-label="Decrease quantity" disabled={i.qty <= 1} onClick={() => dispatch(setQty({ id: i.id, qty: i.qty - 1 }))}>
                        <Minus />
                      </Button>
                      <span className="w-10 text-center font-medium" aria-live="polite">{i.qty}</span>
                      <Button variant="outline" size="icon" aria-label="Increase quantity" disabled={i.qty >= i.stock} onClick={() => dispatch(setQty({ id: i.id, qty: i.qty + 1 }))}>
                        <Plus />
                      </Button>
                    </div>
                    <p className="w-24 text-right font-semibold">{formatINR(i.price * i.qty)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${i.title}`}
                      onClick={() => {
                        dispatch(removeItem(i.id));
                        toast("Removed from cart", { description: i.title });
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Card className="border-2">
              <CardContent className="space-y-4">
                <h2 className="font-heading text-lg font-bold">Order summary</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">{formatINR(subtotal)}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Savings vs MRP</span>
                      <Badge variant="signal" className="h-6 px-2.5 text-sm font-bold">{formatINR(savings)}</Badge>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Total</span>
                  <span className="font-heading text-2xl font-bold">{formatINR(subtotal)}</span>
                </div>
                <Link href="/checkout" className={cn(buttonVariants({ size: "lg" }), "h-10 w-full")}>
                  Proceed to checkout
                </Link>
                <Link href="/products" className={cn(buttonVariants({ variant: "ghost" }), "h-9 w-full")}>
                  Continue shopping
                </Link>
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </main>
  );
}