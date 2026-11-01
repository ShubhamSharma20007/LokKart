import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { ProductDetailView } from "@/components/product-detail-view";
import { getRelatedProducts, getStoreProduct } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const p = await getStoreProduct(id);
  return p ? { title: p.title, description: p.description } : { title: "Product not found" };
}

export default function ProductPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/products" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All products
      </Link>
      <Suspense fallback={<ProductSkeleton />}>
        <ProductContent params={params} />
      </Suspense>
    </main>
  );
}

async function ProductContent({ params }: Props) {
  // Stock and price change, so always read the current product.
  await connection();
  const { id } = await params;
  const product = await getStoreProduct(id);
  // Unknown product ids render app/not-found.tsx, which redirects to "/".
  if (!product) notFound();

  const related = await getRelatedProducts(product, 4);

  return (
    <>
      <ProductDetailView product={product} />

      {related.length > 0 && (
        <section className="mt-14 border-t border-border/40 pt-8" aria-labelledby="related">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h2 id="related" className="font-heading text-xl font-bold tracking-tight text-foreground">
                You may also like
              </h2>
              <p className="text-xs text-muted-foreground">More recommendations from {product.category}</p>
            </div>
            <Link
              href={`/products?category=${encodeURIComponent(product.category)}`}
              className="text-xs sm:text-sm font-semibold text-primary underline-offset-4 hover:underline"
            >
              See all in {product.category} →
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </>
  );
}

function ProductSkeleton() {
  return (
    <div className="mt-6 grid gap-8 md:grid-cols-[400px_1fr] lg:grid-cols-[440px_1fr] lg:gap-12 items-start">
      <div className="aspect-square max-h-[440px] w-full animate-pulse rounded-2xl bg-muted" />
      <div className="space-y-4">
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-16 animate-pulse rounded bg-muted" />
        <div className="h-28 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
