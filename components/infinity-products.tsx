"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import type { StoreProduct } from "@/lib/catalog";

// Shows the products the server already rendered, then fetches the next page
// shortly before the shopper scrolls to the bottom.
export function InfiniteProducts({
  initialProducts,
  initialCursor,
}: {
  initialProducts: StoreProduct[];
  initialCursor: string | null;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false); // stops two fetches for the same page
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!cursor || busy.current) return;
    busy.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/products?cursor=${encodeURIComponent(cursor)}`);
      if (!res.ok) throw new Error(String(res.status));
      const data: { products: StoreProduct[]; nextCursor: string | null } = await res.json();
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.products.filter((p) => !seen.has(p.id))];
      });
      setCursor(data.nextCursor);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [cursor]);

  // Watch a marker below the grid. It is re-created after every page, so if the
  // marker is still on screen (tall window, few products) the next page loads too.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor || failed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, failed, loadMore]);

  if (products.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed p-10 text-center">
        <p className="font-medium">No products yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">New products will show up here as soon as they are added.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy={loading}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
        {loading &&
          [0, 1, 2].map((i) => <div key={`loading-${i}`} className="h-80 animate-pulse rounded-xl bg-muted" aria-hidden />)}
      </div>

      {cursor && <div ref={sentinel} className="h-px" aria-hidden />}

      {failed && (
        <div role="alert" className="mt-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">We could not load more products.</p>
          <Button variant="outline" onClick={() => void loadMore()}>
            Try again
          </Button>
        </div>
      )}

      {!cursor && products.length > initialProducts.length && (
        <p className="mt-8 text-center text-sm text-muted-foreground">You have seen all {products.length} products.</p>
      )}
    </>
  );
}