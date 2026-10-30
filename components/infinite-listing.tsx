"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { listingHref, type ListingParams } from "@/lib/listing-params";
import type { StoreProduct } from "@/lib/catalog";

// Shows the page the server rendered, then fetches the following pages
// (same filters and sort) shortly before the shopper reaches the bottom.
export function InfiniteListing({
  initialProducts,
  params,
  initialPage,
  totalPages,
}: {
  initialProducts: StoreProduct[];
  params: ListingParams;
  initialPage: number;
  totalPages: number;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const hasMore = page < totalPages;

  const loadMore = useCallback(async () => {
    if (!hasMore || busy.current) return;
    busy.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const next = page + 1;
      const url = listingHref(params, { page: next }).replace("/products", "/api/products");
      const res = await fetch(url.includes("?") ? url : `${url}?page=${next}`);
      if (!res.ok) throw new Error(String(res.status));
      const data: { products: StoreProduct[] } = await res.json();
      setProducts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...data.products.filter((p) => !seen.has(p.id))];
      });
      setPage(next);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [hasMore, page, params]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasMore || failed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, failed, loadMore]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4" aria-busy={loading}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
        {loading &&
          [0, 1, 2].map((i) => <div key={`loading-${i}`} className="h-80 animate-pulse rounded-xl bg-muted" aria-hidden />)}
      </div>

      {hasMore && <div ref={sentinel} className="h-px" aria-hidden />}

      {failed && (
        <div role="alert" className="mt-6 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-muted-foreground">We could not load more products.</p>
          <Button variant="outline" onClick={() => void loadMore()}>
            Try again
          </Button>
        </div>
      )}

      {!hasMore && products.length > initialProducts.length && (
        <p className="mt-8 text-center text-sm text-muted-foreground">You have seen all products.</p>
      )}
    </>
  );
}