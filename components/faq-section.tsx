"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type FAQItem = {
  q: string;
  a: string;
};

const FAQS: FAQItem[] = [
  {
    q: "How long will delivery take?",
    a: "Orders are typically delivered within 3 to 6 business days across India. As soon as your order is dispatched via our courier partners (Delhivery, Blue Dart, Shadowfax), you will receive an AWB tracking number with live tracking updates on your email.",
  },
  {
    q: "Is delivery really 100% Free?",
    a: "Yes! All products listed on Bachatnix include Free Standard Delivery across India. There are no surprise shipping charges added at checkout.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept instant, zero-fee UPI payments (Google Pay, PhonePe, Paytm, BHIM, and all UPI apps) via Cashfree secured gateway, as well as Cash on Delivery (COD) at your doorstep.",
  },
  {
    q: "How can I track my order?",
    a: "You can track your order anytime by visiting 'My Orders' in the top menu and clicking the 'Track Order' button. You will also get live tracking links sent to your registered email as soon as your package is dispatched.",
  },
  {
    q: "Are products original and brand new?",
    a: "Yes, every product on Bachatnix is 100% authentic and genuine. We display the original MRP and our discounted Bachat price side-by-side on every product so you know exactly how much you save.",
  },
  {
    q: "What if my package arrives damaged?",
    a: "Your purchase is completely safe. In the unlikely event that an item arrives damaged or defective, we provide a quick replacement. Simply reply to your order confirmation email or reach out to our support team with your order reference number.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First item open by default

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section className="mx-auto max-w-4xl px-4 py-16">
      <div className="text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
          <HelpCircle className="size-3.5" />
          Got Questions?
        </div>
        <h2 className="font-heading mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Frequently Asked Questions
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything you need to know about shopping, delivery, and payments on Bachatnix.
        </p>
      </div>

      <div className="mt-10 space-y-3">
        {FAQS.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={item.q}
              className={cn(
                "rounded-xl border transition-colors",
                isOpen
                  ? "border-primary/40 bg-card shadow-xs"
                  : "border-border bg-card/50 hover:bg-card hover:border-border/80"
              )}
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="flex w-full items-center justify-between gap-4 p-4 text-left font-medium sm:p-5"
                aria-expanded={isOpen}
              >
                <span className="text-base font-semibold">{item.q}</span>
                <ChevronDown
                  className={cn(
                    "size-5 shrink-0 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-180 text-primary"
                  )}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-5 pt-0 text-sm leading-relaxed text-muted-foreground sm:px-5">
                  <div className="border-t border-border/60 pt-3">{item.a}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

