import React from "react";

export const PAYMENT_METHODS = [
  { name: "Visa", src: "/Visa.svg" },
  { name: "Mastercard", src: "/Mastercard.svg" },
  { name: "PayPal", src: "/Paypal.svg" },
  // { name: "Apple Pay", src: "/ Pay.svg" },
  { name: "Google Pay", src: "/G Pay.svg" },
] as const;

export function PaymentBadges({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 sm:gap-2.5 flex-wrap ${className}`}>
      {PAYMENT_METHODS.map((pm) => (
        <div
          key={pm.name}
          className="h-8 sm:h-9 min-w-[46px] sm:min-w-[50px] px-2.5 rounded-[8px] bg-white border border-black/10 shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex items-center justify-center transition-transform hover:scale-105 shrink-0"
          title={pm.name}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pm.src}
            alt={pm.name}
            className="max-h-5 sm:max-h-5.5 w-auto object-contain"
          />
        </div>
      ))}
    </div>
  );
}
