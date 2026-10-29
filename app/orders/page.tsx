"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MapPin, Package, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/auth-provider";
import { auth } from "@/hooks/useFirebaseAuth";
import { getMyOrders, type MyOrder } from "@/lib/order-actions";
import { formatINR } from "@/lib/products";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderTrackingModal } from "@/components/order-tracking-modal";

const statusLabel: Record<MyOrder["status"], string> = {
  PLACED: "Order placed",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const statusVariant: Record<MyOrder["status"], "secondary" | "default" | "signal" | "destructive"> = {
  PLACED: "secondary",
  CONFIRMED: "default",
  SHIPPED: "signal",
  DELIVERED: "default",
  CANCELLED: "destructive",
};

function paymentText(o: MyOrder) {
  if (o.paymentMethod === "COD") return "Cash on Delivery";
  if (o.paymentStatus === "PAID") return "UPI · Paid";
  if (o.paymentStatus === "FAILED") return "UPI · Payment failed";
  return "UPI · Verifying payment";
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

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
        if (!cancelled) setError("We could not load your orders. Please try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, attempt]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight">My orders</h1>
        {orders && orders.length > 0 && (
          <Badge variant="secondary" className="h-6 px-2.5 text-sm">
            {orders.length} {orders.length === 1 ? "order" : "orders"}
          </Badge>
        )}
      </div>

      {loading ? (
        <OrdersSkeleton />
      ) : !user ? (
        <div className="mx-auto mt-8 max-w-xl rounded-2xl border bg-card px-6 py-12 text-center shadow-sm">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-signal/30 ring-8 ring-signal/15">
            <Package className="size-7 text-primary" aria-hidden />
          </div>
          <h2 className="font-heading mt-5 text-xl font-bold">Sign in to see your orders</h2>
          <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
            Orders you place while signed in show up here with their status.
          </p>
          <Button className="mt-6 h-10 px-5" onClick={signIn} disabled={signingIn}>
            {signingIn && <Loader2 className="animate-spin" aria-hidden />}
            {signingIn ? "Signing in..." : "Sign in with Google"}
          </Button>
        </div>
      ) : error ? (
        <div role="alert" className="mt-8 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" className="mt-4" onClick={retry}>
            Try again
          </Button>
        </div>
      ) : orders === null ? (
        <OrdersSkeleton />
      ) : orders.length === 0 ? (
        <div className="mx-auto mt-8 max-w-xl rounded-2xl border bg-card px-6 py-12 text-center shadow-sm">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-signal/30 ring-8 ring-signal/15">
            <Package className="size-7 text-primary" aria-hidden />
          </div>
          <h2 className="font-heading mt-5 text-xl font-bold">No orders yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
            When you place an order it will show up here.
          </p>
          <Link href="/products" className={cn(buttonVariants({ size: "lg" }), "mt-6 h-10 px-5")}>
            Browse products
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((o) => (
            <li key={o.id}>
              <Card>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold">{o.ref}</p>
                      <p className="text-sm text-muted-foreground">
                        Placed on {dateFmt.format(new Date(o.createdAt))}
                      </p>
                    </div>
                    <Badge variant={statusVariant[o.status]} className="h-6 px-2.5 text-sm">
                      {statusLabel[o.status]}
                    </Badge>
                  </div>

                  <Separator />

                  <ul className="space-y-2 text-sm">
                    {o.items.map((i) => (
                      <li key={i.id} className="flex justify-between gap-3">
                        <Link href={`/products/${i.productId}`} className="hover:underline">
                          {i.title} <span className="text-muted-foreground">× {i.qty}</span>
                        </Link>
                        <span className="font-medium">{formatINR(i.price * i.qty)}</span>
                      </li>
                    ))}
                  </ul>

                  <Separator />

                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>{paymentText(o)}</p>
                      {o.address.address && (
                        <p className="flex items-start gap-1.5">
                          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                          <span>
                            {o.address.address}, {o.address.city}, {o.address.state} {o.address.pincode}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-2">
                      {o.awb && (
                        <div className="text-xs text-muted-foreground font-mono">
                          <Truck className="inline size-3 mr-1" aria-hidden />
                          AWB: {o.awb} &middot; {o.courierName}
                        </div>
                      )}
                      {o.status !== "PLACED" && o.status !== "CANCELLED" && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setTrackingOrder(o)}>
                          <Truck className="size-3 mr-1" aria-hidden /> Track Order
                        </Button>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-heading text-2xl font-bold">{formatINR(o.total)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {trackingOrder && (
        <OrderTrackingModal
          open={!!trackingOrder}
          onOpenChange={(open) => { if (!open) setTrackingOrder(null); }}
          order={trackingOrder}
        />
      )}
    </main>
  );
}

function OrdersSkeleton() {
  return (
    <ul className="mt-6 space-y-4" aria-busy="true" aria-label="Loading your orders">
      {[0, 1].map((i) => (
        <li key={i}>
          <Card>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3.5 w-36" />
                </div>
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>

              <Separator />

              <div className="space-y-2">
                {[0, 1].map((j) => (
                  <div key={j} className="flex justify-between gap-3">
                    <Skeleton className="h-4 w-48 max-w-full" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3.5 w-64 max-w-full" />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Skeleton className="h-3.5 w-10" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
