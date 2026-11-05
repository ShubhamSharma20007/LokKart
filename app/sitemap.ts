import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "https://bachatnix.vercel.app"
  ).replace(/\/$/, "");

  // 1. Core static storefront pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  try {
    // 2. Fetch all products from DB
    const products = await prisma.product.findMany({
      select: {
        id: true,
        category: true,
        createdAt: true,
      },
    });

    // 3. Dynamic Product detail URLs
    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${baseUrl}/products/${p.id}`,
      lastModified: p.createdAt ?? new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    // 4. Category collection URLs (e.g. Shirts, T-Shirts, etc.)
    const uniqueCategories = Array.from(
      new Set(products.map((p) => p.category?.trim()).filter(Boolean))
    );

    const categoryRoutes: MetadataRoute.Sitemap = uniqueCategories.map((cat) => ({
      url: `${baseUrl}/products?category=${encodeURIComponent(cat)}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    }));

    return [...staticRoutes, ...categoryRoutes, ...productRoutes];
  } catch (error) {
    console.error("[SEO Sitemap] Error generating dynamic sitemap:", error);
    return staticRoutes;
  }
}

