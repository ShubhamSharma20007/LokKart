import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "https://bachatnix.vercel.app"
  ).replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/favicon.ico",
          "/favicon.png",
          "/icon.png",
          "/products",
          "/products/*",
          "/about",
          "/terms",
          "/privacy-policy",
          "/api/feed/google",
        ],
        disallow: [
          "/admin",
          "/admin/*",
          "/cart",
          "/checkout",
          "/orders",
          "/orders/*",
          "/profile",
          "/profile/*",
          "/api/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

