import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";
import { Providers } from "@/components/provider";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "sonner";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
});

const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://bachatnix.com").replace(/\/$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Bachatnix | Buy Clothes Online - Trendy Fashion at Best Prices",
    template: "%s | Bachatnix",
  },
  description:
    "Shop high-quality clothes, men's shirts, stylish t-shirts, and daily fashion at prices well below MRP with 100% Free Shipping and Cash on Delivery across India.",
  keywords: [
    "clothes online",
    "buy clothes online",
    "online clothing store",
    "men shirts online",
    "men t-shirts",
    "budget fashion India",
    "Bachatnix",
    "cash on delivery clothes",
    "free shipping clothing",
    "affordable fashion",
  ],
  authors: [{ name: "Bachatnix" }],
  creator: "Bachatnix",
  publisher: "Bachatnix",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Bachatnix | Buy Clothes Online - Trendy Fashion at Best Prices",
    description:
      "Shop high-quality clothes, men's shirts, stylish t-shirts, and daily fashion at prices well below MRP with 100% Free Shipping & Cash on Delivery across India.",
    url: siteUrl,
    siteName: "Bachatnix",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/favicon.png",
        width: 512,
        height: 512,
        alt: "Bachatnix Online Fashion Store",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bachatnix | Buy Clothes Online - Trendy Fashion at Best Prices",
    description:
      "Shop quality clothes, daily wear, and trending apparel with Free Shipping and Cash on Delivery.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/app-icon.png",
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Bachatnix",
      url: siteUrl,
      logo: `${siteUrl}/favicon.png`,
      sameAs: [],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        availableLanguage: ["en", "hi"],
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Bachatnix",
      description: "Buy Clothes Online at Best Prices with Free Shipping & COD",
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/products?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        {/* Google Site verification */}
        <meta name="google-site-verification" content="mxzOA0MOF2vTkx9m6lHCu_FbG9W9j_Rax2Sobuh4JEc" />
        
        <Providers>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <Suspense
              fallback={
                <div className="flex min-h-[60vh] flex-1 items-center justify-center gap-3">
                  <Spinner className="size-8" />
                  <h1 className="text-lg font-medium">Loading...</h1>
                </div>
              }
            >
              {children}
            </Suspense>
          </div>
         <Suspense>
           <SiteFooter />
         </Suspense>
        </Providers>
        <Toaster closeButton
          toastOptions={{
            classNames: {
              closeButton: '!right-0 !left-auto !translate-x-0',
            }
          }}
        />
      </body>
    </html>
  );
}