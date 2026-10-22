import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { badgeVariants } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { categoryIcons } from "./category-icon";
import { categories } from "@/lib/products";
import { cn } from "@/lib/utils";

export function EmptyCart() {
  return (
    <div className="mx-auto mt-8 max-w-xl rounded-2xl border bg-card px-6 py-12 text-center shadow-sm">
      <div className="mx-auto grid size-20 place-items-center rounded-full bg-signal/30 ring-8 ring-signal/15">
        <ShoppingBag className="size-9 text-primary" aria-hidden />
      </div>
      <h2 className="font-heading mt-6 text-2xl font-bold tracking-tight">Your cart is empty</h2>
      <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
        Add something you like and it will wait for you here. Every product shows the MRP, our price and what is left in stock.
      </p>
      <Link href="/products" className={cn(buttonVariants({ size: "lg" }), "mt-6 h-10 px-5")}>
        Browse all products
      </Link>
      <div className="mt-8 border-t pt-6">
        <p className="text-sm font-medium">Or shop by category</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {categories.map((c) => {
            const Icon = categoryIcons[c];
            return (
              <Link
                key={c}
                href={`/products?category=${encodeURIComponent(c)}`}
                className={cn(badgeVariants({ variant: "outline" }), "h-8 gap-1.5 px-3 text-sm hover:bg-muted")}
              >
                <Icon aria-hidden />
                {c}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Shown until the saved cart is loaded, so "empty" never flashes for a full cart.
export function CartSkeleton() {
  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr]" aria-busy="true" aria-label="Loading your cart">
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-56 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}