import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Catalog } from "@/components/catalog";
import { CatalogSkeleton } from "@/components/catalog-skeleton";
import { listProducts } from "@/lib/catalog";
import { categories, type Category } from "@/lib/products";

export const metadata: Metadata = {
  title: "All products",
  description: "Browse garments, footwear, electronics and industrial parts at prices below MRP.",
};

type Props = { searchParams: Promise<{ category?: string | string[] }> };

export default function ProductsPage({ searchParams }: Props) {
  return (
    <main>
      <section className="border-b bg-brand text-brand-foreground">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <h1 className="font-heading max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Find something you love.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-brand-foreground/75 sm:text-lg">
            Compare MRP and price, check stock, and add to your cart.
          </p>
        </div>
      </section>
      <Suspense fallback={<CatalogSkeleton />}>
        <ProductsCatalog searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ProductsCatalog({ searchParams }: Props) {
  // Products change whenever an admin adds one, so render per request, not at build time.
  await connection();
  const { category } = await searchParams;
  const products = await listProducts();

  // Supports links like /products?category=Footwear (used by the empty-cart page).
  const initial: Category | "All" =
    typeof category === "string" && (categories as readonly string[]).includes(category)
      ? (category as Category)
      : "All";

  return <Catalog key={initial} products={products} heading="All products" initialCategory={initial} />;
}