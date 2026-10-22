import type { Metadata } from "next";
import { Catalog } from "@/components/catalog";
import { products } from "@/lib/products";

export const metadata: Metadata = {
  title: "All products",
  description: "Browse garments, footwear, electronics and industrial parts at prices below MRP.",
};

export default function ProductsPage() {
  return (
    <main>
      <section className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <h1 className="font-heading max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Find something you love.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-primary-foreground/75 sm:text-lg">
            Compare MRP and price, check stock, and add to your cart.
          </p>
        </div>
      </section>
      <Catalog products={products} heading="All products" />
    </main>
  );
}