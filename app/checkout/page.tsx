import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CheckoutForm } from "@/components/checkout-form";

export const metadata = {
  title: "Checkout | Bachatnix",
  description: "Complete your order securely with Cash on Delivery or instant UPI payment.",
};

export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-black/50 mb-6">
        <Link href="/" className="hover:text-black transition-colors">
          Home
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href="/cart" className="hover:text-black transition-colors">
          Cart
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-black font-medium">Checkout</span>
      </nav>

      {/* Heading */}
      <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-black tracking-tight uppercase mb-8">
        CHECKOUT
      </h1>

      <CheckoutForm />
    </main>
  );
}
