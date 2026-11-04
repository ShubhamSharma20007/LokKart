"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, MapPin, Package, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/auth-provider";
import { auth } from "@/hooks/useFirebaseAuth";
import { getMyOrders, type MyOrder } from "@/lib/order-actions";
import { formatINR } from "@/lib/products";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderTrackingModal } from "@/components/order-tracking-modal";

const statusLabel: Record<MyOrder["status"], string> = {
  PLACED: "Order Placed",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

function paymentText(o: MyOrder) {
  if (o.paymentMethod === "COD") return "Cash on Delivery";
  if (o.paymentStatus === "PAID") return "UPI · Paid";
  if (o.paymentStatus === "FAILED") return "UPI · Payment Failed";
  return "UPI · Verifying Payment";
}

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default function OrdersPage() {
  const { user, loading, signIn, signingIn } = useAuth();
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [trackingOrder, setTrackingOrder] = useState<MyOrder | null>(null);

  const retry = () => {
    setOrders(null);
    setError(null);
    setAttempt((n) => n + 1);
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error("no token");
        const res = await getMyOrders(token);
        if (cancelled) return;
        if (res.ok) {
          setOrders(res.orders);
          setError(null);
        } else {
          setError(res.message);
        }
      } catch {
        if (!cancelled) setError("Could not load your orders. Please try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, attempt]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-black/50 mb-6">
        <Link href="/" className="hover:text-black transition-colors">
          Home
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-black font-medium">My Orders</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-black text-black tracking-tight uppercase">
          MY ORDERS
        </h1>
        {orders && orders.length > 0 && (
          <Badge className="rounded-full bg-black/5 border border-black/10 text-black px-3.5 py-1 text-xs font-semibold">
            {orders.length} {orders.length === 1 ? "Order" : "Orders"}
          </Badge>
        )}
      </div>

      {loading ? (
        <OrdersSkeleton />
      ) : !user ? (
        <div className="mx-auto max-w-xl rounded-[20px] border border-black/10 bg-white px-6 py-14 text-center shadow-2xs">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-black/5 text-black">
            <Package className="size-8" aria-hidden />
          </div>
          <h2 className="font-heading mt-6 text-2xl font-black text-black tracking-tight">
            Sign in to view your orders
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-black/60 leading-relaxed">
            Track past purchases, live delivery status, and invoice details.
          </p>
          <Button
            className="mt-6 h-12 px-8 rounded-full bg-black text-white hover:bg-black/85 font-medium text-sm transition-all shadow-sm"
            onClick={signIn}
            disabled={signingIn}
          >
            {signingIn && <Loader2 className="size-4 animate-spin mr-2" aria-hidden />}
            {signingIn ? "Signing in..." : "Sign in with Google"}
          </Button>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-[20px] border border-destructive/20 bg-destructive/5 p-8 text-center"
        >
          <p className="text-sm font-medium text-destructive">{error}</p>
          <Button
            variant="outline"
            className="mt-4 rounded-full border-black/15 text-xs font-semibold hover:bg-black hover:text-white"
            onClick={retry}
          >
            Try again
          </Button>
        </div>
      ) : orders === null ? (
        <OrdersSkeleton />
      ) : orders.length === 0 ? (
        <div className="mx-auto max-w-xl rounded-[20px] border border-black/10 bg-white px-6 py-14 text-center shadow-2xs">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-black/5 text-black">
            <Package className="size-8" aria-hidden />
          </div>
          <h2 className="font-heading mt-6 text-2xl font-black text-black tracking-tight">
            No orders placed yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-black/60 leading-relaxed">
            When you purchase items, they will appear here along with tracking numbers.
          </p>
          <Link
            href="/products"
            className="inline-block mt-6 h-12 px-8 rounded-full bg-black text-white hover:bg-black/85 font-medium text-sm leading-[48px] transition-all shadow-sm"
          >
            Browse Collection
          </Link>
        </div>
      ) : (
        <ul className="space-y-5">
          {orders.map((o) => (
            <li key={o.id}>
              <div className="rounded-[20px] border border-black/10 bg-white p-6 sm:p-7 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-black">{o.ref}</p>
                    <p className="text-xs text-black/50 mt-0.5">
                      Placed on {dateFmt.format(new Date(o.createdAt))}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider",
                      o.status === "DELIVERED"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                        : o.status === "CANCELLED"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-black/5 text-black border border-black/10"
                    )}
                  >
                    {statusLabel[o.status]}
                  </Badge>
                </div>

                <Separator className="border-black/5" />

                <ul className="space-y-2.5 text-sm">
                  {o.items.map((i) => (
                    <li key={i.id} className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/products/${i.productId}`}
                          className="font-medium text-black hover:underline"
                        >
                          {i.title}
                        </Link>
                        {i.color && (
                          <Badge variant="outline" className="rounded-full h-5 px-2 text-[10px] font-semibold border-black/15">
                            {i.color}
                          </Badge>
                        )}
                        {i.size && (
                          <Badge className="rounded-full bg-black/5 text-black border border-black/10 h-5 px-2 text-[10px] font-semibold">
                            Size: {i.size}
                          </Badge>
                        )}
                        <span className="text-xs text-black/50 font-mono">× {i.qty}</span>
                      </div>
                      <span className="font-bold text-sm text-black">
                        {formatINR(i.price * i.qty)}
                      </span>
                    </li>
                  ))}
                </ul>

                <Separator className="border-black/5" />

                <div className="flex flex-wrap items-end justify-between gap-4 pt-1">
                  <div className="space-y-1 text-xs sm:text-sm text-black/60">
                    <p className="font-medium text-black">{paymentText(o)}</p>
                    {o.address.address && (
                      <p className="flex items-start gap-1.5 text-xs text-black/60 max-w-md">
                        <MapPin className="mt-0.5 size-3.5 shrink-0 text-black/40" aria-hidden />
                        <span>
                          {o.address.address}, {o.address.city}, {o.address.state} {o.address.pincode}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-start sm:items-end gap-2">
                    {o.awb && (
                      <div className="text-xs text-black/60 font-mono flex items-center gap-1">
                        <Truck className="size-3.5 text-black/40" aria-hidden />
                        <span>
                          AWB: <strong className="text-black">{o.awb}</strong> &middot; {o.courierName}
                        </span>
                      </div>
                    )}
                    {o.status !== "PLACED" && o.status !== "CANCELLED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-full border-black/15 text-xs font-semibold hover:bg-black hover:text-white transition-colors"
                        onClick={() => setTrackingOrder(o)}
                      >
                        <Truck className="size-3.5 mr-1.5" aria-hidden /> Track Order
                      </Button>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-black/50">Total Amount</p>
                    <p className="font-heading text-xl sm:text-2xl font-black text-black">
                      {formatINR(o.total)}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {trackingOrder && (
        <OrderTrackingModal
          open={!!trackingOrder}
          onOpenChange={(open) => {
            if (!open) setTrackingOrder(null);
          }}
          order={trackingOrder}
        />
      )}
    </main>
  );
}

function OrdersSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading your orders">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-[20px] border border-black/10 bg-white p-6 sm:p-7 space-y-4 shadow-2xs animate-pulse"
        >
          {/* Header row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32 rounded-lg bg-black/[0.07]" />
              <Skeleton className="h-3.5 w-44 rounded-md bg-black/[0.04]" />
            </div>
            <Skeleton className="h-7 w-28 rounded-full bg-black/[0.06]" />
          </div>

          <Separator className="border-black/5" />

          {/* Item rows */}
          <div className="space-y-3 py-1">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-52 max-w-[50vw] rounded-md bg-black/[0.07]" />
                <Skeleton className="h-5 w-14 rounded-full bg-black/[0.04]" />
                <Skeleton className="h-4 w-6 rounded-md bg-black/[0.04]" />
              </div>
              <Skeleton className="h-4 w-16 rounded-md bg-black/[0.07] shrink-0" />
            </div>
            {i === 1 && (
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-40 max-w-[45vw] rounded-md bg-black/[0.07]" />
                  <Skeleton className="h-5 w-14 rounded-full bg-black/[0.04]" />
                  <Skeleton className="h-4 w-6 rounded-md bg-black/[0.04]" />
                </div>
                <Skeleton className="h-4 w-16 rounded-md bg-black/[0.07] shrink-0" />
              </div>
            )}
          </div>

          <Separator className="border-black/5" />

          {/* Footer row */}
          <div className="flex flex-wrap items-end justify-between gap-4 pt-1">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 rounded-md bg-black/[0.06]" />
              <Skeleton className="h-3.5 w-64 max-w-[65vw] rounded-md bg-black/[0.04]" />
            </div>

            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-28 rounded-full bg-black/[0.06]" />
              <div className="text-right space-y-1.5">
                <Skeleton className="h-3 w-16 rounded-md bg-black/[0.04] ml-auto" />
                <Skeleton className="h-6 w-20 rounded-md bg-black/[0.08] ml-auto" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
