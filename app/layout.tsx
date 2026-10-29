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
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "Bachatnix | Buy surplus stock by the lot", template: "%s | Bachatnix" },
  description:
    "Garments, footwear, electronics and industrial parts from manufacturers clearing unsold inventory, priced below factory cost.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: "/app-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">
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
          <SiteFooter />
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