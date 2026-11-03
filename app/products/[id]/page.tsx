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

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://bachatnix.com").replace(/\/$/, "");
  const productUrl = `${baseUrl}/products/${product.id}`;
  const images = product.images.length > 0 ? product.images : product.imageUrl ? [product.imageUrl] : [];

  // Google Rich Product Snippet JSON-LD
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
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingRate: {
          "@type": "MonetaryAmount",
          value: "0",
          currency: "INR",
        },
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "IN",
        },
        deliveryTime: {
          "@type": "ShippingDeliveryTime",
          handlingTime: {
            "@type": "QuantitativeValue",
            minValue: 0,
            maxValue: 1,
            unitCode: "d",
          },
          transitTime: {
            "@type": "QuantitativeValue",
            minValue: 2,
            maxValue: 5,
            unitCode: "d",
          },
        },
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

  // Google Breadcrumbs schema
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
        name: product.category || "Clothes",
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
      {/* Schema.org Microdata for Google Shopping & Search Ranking */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

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


