import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { badgeVariants } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { categoryIcons } from "./category-icon";
import { categories } from "@/lib/products";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

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
function SummarySkeleton() {
  return (
    <Card className="border-2">
      <CardContent className="space-y-4">
        <Skeleton className="h-6 w-36" />
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-8 w-28" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

// Shown until the saved cart is loaded, so "empty" never flashes for a full cart.
export function CartSkeleton() {
  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr]" aria-busy="true" aria-label="Loading your cart">
      <ul className="space-y-3">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <Card>
              <CardContent className="flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-48 max-w-full" />
                  <Skeleton className="h-3.5 w-32" />
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className="size-8 rounded-lg" />
                  <Skeleton className="mx-1 h-4 w-8" />
                  <Skeleton className="size-8 rounded-lg" />
                </div>
                <Skeleton className="h-5 w-24" />
                <Skeleton className="size-8 rounded-lg" />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <SummarySkeleton />
      </aside>
    </div>
  );
}

// The checkout page has a different layout (address and payment sections), so it gets its own.
export function CheckoutSkeleton() {
  const field = (span = false) => (
    <div className={span ? "space-y-1.5 sm:col-span-2" : "space-y-1.5"}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
  );

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1.5fr_1fr]" aria-busy="true" aria-label="Loading checkout">
      <div className="space-y-6">
        <section className="space-y-4 rounded-xl border bg-card p-5">
          <Skeleton className="h-6 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            {field()}
            {field()}
            {field(true)}
            {field()}
            {field()}
            {field()}
          </div>
        </section>
        <section className="space-y-4 rounded-xl border bg-card p-5">
          <Skeleton className="h-6 w-40" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-[74px] rounded-lg" />
            <Skeleton className="h-[74px] rounded-lg" />
          </div>
        </section>
      </div>
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <SummarySkeleton />
      </aside>
    </div>
  );
}