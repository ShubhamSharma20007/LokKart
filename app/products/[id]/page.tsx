import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { ProductDetailView } from "@/components/product-detail-view";
import { ProductSkeleton } from "./product-skeleton";
import { getRelatedProducts, getStoreProduct } from "@/lib/catalog";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const p = await getStoreProduct(id);
  return p ? { title: p.title, description: p.description } : { title: "Product not found" };
}

export default function ProductPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-4 sm:py-8">
      {/* Top Navigation Row - fixed height to prevent back button from jumping/shifting */}
      <div className="flex items-center min-h-[32px] mb-4 sm:mb-6">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" aria-hidden /> All products
        </Link>
      </div>

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


