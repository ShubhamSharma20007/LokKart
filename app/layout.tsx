import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";
import { Providers } from "@/components/provider";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "sonner";
import { Suspense } from "react";

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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col font-sans">
        <Suspense fallback={null}>
          
        <Providers>
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </Providers>
        </Suspense>
        <Toaster  closeButton
        toastOptions={{
          classNames:{
           closeButton: '!right-0 !left-auto !translate-x-0',
          }
        }}
        />
      </body>
    </html>
  );
}