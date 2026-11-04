"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Minus, Plus, Trash2, Tag, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { CartSkeleton, EmptyCart } from "@/components/cart-states";
import { useAuth } from "@/components/auth-provider";
import { auth } from "@/hooks/useFirebaseAuth";
import { checkFirstOrderEligibility } from "@/lib/order-actions";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { removeItem, selectCount, selectHydrated, selectSubtotal, setQty } from "@/lib/store/slices/cartSlice";
import { formatINR, getColorHex } from "@/lib/products";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";

export default function CartPage() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.cart.items);
  const hydrated = useAppSelector(selectHydrated);
  const subtotal = useAppSelector(selectSubtotal);
  const count = useAppSelector(selectCount);
  const mounted = useMounted();
  const isReady = mounted && hydrated;
  const { user } = useAuth();

  const [isFirstOrder, setIsFirstOrder] = useState<boolean | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoDiscountPct, setPromoDiscountPct] = useState<number>(0);
  const [promoLoading, setPromoLoading] = useState(false);

  // 1. Load saved promo from localStorage on mount (only if user hasn't removed it)
  useEffect(() => {
    try {
      const isRemoved = localStorage.getItem("bachatnix_promo_removed") === "true";
      if (!isRemoved) {
        const saved = localStorage.getItem("bachatnix_applied_promo");
        if (saved) {
          setAppliedPromo(saved.toUpperCase());
          setPromoDiscountPct(20);
        }
      }
    } catch {}
  }, []);

  // 2. Check first order eligibility (runs only when user auth changes)
  useEffect(() => {
    if (!user) {
      setIsFirstOrder(null);
      return;
    }
    let cancelled = false;
    async function checkDiscount() {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const res = await checkFirstOrderEligibility(token);
        if (!cancelled) {
          setIsFirstOrder(res.isFirstOrder);
          const isRemoved = localStorage.getItem("bachatnix_promo_removed") === "true";
          const saved = localStorage.getItem("bachatnix_applied_promo");
          // Only auto-apply if first order AND user has NOT explicitly removed the promo
          if (res.isFirstOrder && !isRemoved && !saved) {
            setAppliedPromo("WELCOME20");
            setPromoDiscountPct(20);
            try {
              localStorage.setItem("bachatnix_applied_promo", "WELCOME20");
            } catch {}
          } else if (!res.isFirstOrder) {
            setAppliedPromo(null);
            setPromoDiscountPct(0);
            try {
              localStorage.removeItem("bachatnix_applied_promo");
            } catch {}
          }
        }
      } catch (err) {
        console.error("Failed to check first order eligibility in cart", err);
      }
    }
    void checkDiscount();
    return () => { cancelled = true; };
  }, [user]);

  const discountAmount = appliedPromo && promoDiscountPct > 0
    ? Math.round((subtotal * promoDiscountPct) / 100)
    : 0;
  const deliveryFee = 0; // Always free delivery
  const cartTotal = subtotal - discountAmount + deliveryFee;

  const handlePromoApply = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      toast.error("Please enter a promo code");
      return;
    }
    setPromoLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, token }),
      });
      const data = await res.json();
      if (!data.ok) {
        toast.error(data.message || "Invalid promo code");
        return;
      }
      setAppliedPromo(code);
      setPromoDiscountPct(data.discountPct || 20);
      try {
        localStorage.setItem("bachatnix_applied_promo", code);
        localStorage.removeItem("bachatnix_promo_removed");
      } catch {}
      setPromoCode("");
      toast.success(data.message || `${data.discountPct}% discount applied!`);
    } catch {
      toast.error("Failed to apply promo code. Try again.");
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoDiscountPct(0);
    try {
      localStorage.removeItem("bachatnix_applied_promo");
      localStorage.setItem("bachatnix_promo_removed", "true");
    } catch {}
    toast.info("Promo code removed");
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-black/50 mb-6">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <ChevronRight className="size-3.5" />
        <span className="text-black font-medium">Cart</span>
      </nav>

      <h1 className="font-heading text-3xl sm:text-4xl font-black tracking-tight mb-8">
        YOUR CART
      </h1>

      {!isReady ? (
        <CartSkeleton />
      ) : items.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          {/* ── Left: Cart Items ── */}
          <div className="rounded-2xl border border-black/10 overflow-hidden">
            {items.map((item, idx) => (
              <div key={item.id}>
                {idx > 0 && <Separator />}
                <div className="flex gap-4 p-4 sm:p-5">
                  {/* Product Image */}
                  <div className="relative shrink-0 h-24 w-24 sm:h-28 sm:w-28 rounded-xl overflow-hidden bg-[#F0EEED]">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="112px"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-black/20 text-xs font-medium">
                        No image
                      </div>
                    )}
                  </div>

                  {/* Product Info + Controls */}
                  <div className="flex flex-1 flex-col min-w-0 gap-1">
                    {/* Top row: title + delete */}
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/products/${item.productId || item.id.split("-")[0]}`}
                        className="font-semibold text-sm sm:text-base leading-tight hover:underline line-clamp-2"
                      >
                        {item.title}
                      </Link>
                      <button
                        type="button"
                        aria-label={`Remove ${item.title}`}
                        className="shrink-0 text-red-500 hover:text-red-700 transition-colors mt-0.5"
                        onClick={() => {
                          dispatch(removeItem(item.id));
                          toast("Removed from cart", { description: item.title });
                        }}
                      >
                        <Trash2 className="size-4.5" />
                      </button>
                    </div>

                    {/* Size & Color */}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs sm:text-sm text-black/60">
                      {item.size && (
                        <span>Size: <span className="font-medium text-black">{item.size}</span></span>
                      )}
                      {item.color && (
                        <span className="flex items-center gap-1.5">
                          Color:{" "}
                          <span className="flex items-center gap-1 font-medium text-black">
                            <span
                              className="size-3 rounded-full border border-black/20"
                              style={{ backgroundColor: getColorHex(item.color) }}
                            />
                            {item.color}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Bottom row: price + qty controls */}
                    <div className="flex items-center justify-between mt-auto pt-2">
                      <div>
                        <p className="font-bold text-base sm:text-xl">{formatINR(item.price * item.qty)}</p>
                        {item.mrp > item.price && (
                          <p className="text-xs text-black/40 line-through">{formatINR(item.mrp * item.qty)}</p>
                        )}
                      </div>

                      {/* Qty pill */}
                      <div
                        className="flex items-center gap-3 rounded-full border border-black/10 bg-[#F0F0F0] px-4 py-2"
                        role="group"
                        aria-label={`Quantity for ${item.title}`}
                      >
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          disabled={item.qty <= 1}
                          className="text-black/60 hover:text-black disabled:opacity-30 transition-colors"
                          onClick={() => dispatch(setQty({ id: item.id, qty: item.qty - 1 }))}
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-5 text-center text-sm font-medium" aria-live="polite">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          disabled={item.qty >= item.stock}
                          className="text-black/60 hover:text-black disabled:opacity-30 transition-colors"
                          onClick={() => dispatch(setQty({ id: item.id, qty: item.qty + 1 }))}
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    {item.qty >= item.stock && (
                      <p className="text-xs font-medium text-red-500">Maximum available quantity</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Right: Order Summary ── */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-2xl border border-black/10 p-5 sm:p-6 space-y-5">
              <h2 className="font-heading text-xl font-bold">Order Summary</h2>

              <div className="space-y-3 text-sm sm:text-[15px]">
                <div className="flex justify-between">
                  <span className="text-black/60">Subtotal</span>
                  <span className="font-medium">{formatINR(subtotal)}</span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-red-500 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span>Discount ({appliedPromo || "Promo"} -{promoDiscountPct}%)</span>
                    </span>
                    <span>-{formatINR(discountAmount)}</span>
                  </div>
                )}

                {!user && (
                  <div className="flex justify-between text-black/40 italic text-xs">
                    <span>Sign in and use WELCOME20 for 20% off your first order</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-black/60">Delivery Fee</span>
                  <span className="font-medium text-emerald-600">FREE</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-medium text-base">Total</span>
                <span className="font-heading font-bold text-2xl">{formatINR(cartTotal)}</span>
              </div>

              {/* Promo Code Section */}
              {appliedPromo ? (
                <div className="flex items-center justify-between rounded-full bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs text-emerald-800">
                  <div className="flex items-center gap-2">
                    <Tag className="size-3.5 text-emerald-600" />
                    <span>
                      Code <strong className="font-bold">{appliedPromo}</strong> applied (-{promoDiscountPct}%)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="text-emerald-700 hover:text-red-600 font-bold ml-2 underline text-xs cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-black/40" />
                    <Input
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Add promo code"
                      className="pl-9 h-11 rounded-full border-black/15 bg-[#F0F0F0] text-sm placeholder:text-black/40 focus-visible:ring-black/20"
                    />
                  </div>
                  <Button
                    type="button"
                    disabled={promoLoading}
                    onClick={handlePromoApply}
                    className="h-11 px-5 rounded-full bg-black text-white text-sm font-medium hover:bg-black/80 cursor-pointer"
                  >
                    {promoLoading ? "..." : "Apply"}
                  </Button>
                </div>
              )}

              {/* Checkout Button */}
              <Link
                href={appliedPromo ? `/checkout?promo=${encodeURIComponent(appliedPromo)}` : "/checkout"}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 w-full rounded-full bg-black text-white text-sm font-medium hover:bg-black/80 flex items-center justify-center gap-2"
                )}
              >
                Go to Checkout
                <ChevronRight className="size-4" />
              </Link>

              <Link
                href="/products"
                className="block text-center text-sm text-black/50 hover:text-black transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}
