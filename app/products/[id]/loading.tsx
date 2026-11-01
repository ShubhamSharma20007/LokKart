import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductSkeleton } from "./product-skeleton";

export default function Loading() {
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

      <ProductSkeleton />
    </main>
  );
}
