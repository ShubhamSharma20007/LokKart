"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type VerifyState = "loading" | "paid" | "failed" | "pending";

export default function PaymentResultPage() {
  const params = useSearchParams();
  const router = useRouter();
  const orderId = params.get("orderId") ?? "";

  const [state, setState] = useState<VerifyState>("loading");
  const [retries, setRetries] = useState(0);
  const MAX_RETRIES = 10; // 10 × 3s = 30s max

  const verify = useCallback(async () => {
    if (!orderId) {
      setState("failed");
      return;
    }

    // We verify via the API route (server-side getCashfreeOrderStatus needs cf_order_id)
    // The orderId from URL is our DB ref (e.g. ORD-XXXXX) — we use the status API
    const res = await fetch(`/api/cashfree/order-status?orderId=${encodeURIComponent(orderId)}`);
    if (!res.ok) {
      setState("failed");
      return;
    }
    const json = (await res.json()) as {
      ok: boolean;
      status?: "PAID" | "ACTIVE" | "EXPIRED" | "CANCELLED";
    };

    if (!json.ok) {
      setState("failed");
      return;
    }

    if (json.status === "PAID") {
      setState("paid");
    } else if (json.status === "EXPIRED" || json.status === "CANCELLED") {
      setState("failed");
    } else {
      // ACTIVE / PENDING — retry
      setState("pending");
    }
  }, [orderId]);

  // Initial 2-second delay, then verify
  useEffect(() => {
    const timer = setTimeout(() => {
      void verify();
    }, 2000);
    return () => clearTimeout(timer);
  }, [verify]);

  // Auto-retry every 3 seconds while pending
  useEffect(() => {
    if (state !== "pending") return;
    if (retries >= MAX_RETRIES) {
      setState("failed");
      return;
    }
    const timer = setTimeout(() => {
      setRetries((r) => r + 1);
      void verify();
    }, 3000);
    return () => clearTimeout(timer);
  }, [state, retries, verify]);

  // Auto-redirect after success
  useEffect(() => {
    if (state !== "paid") return;
    const timer = setTimeout(() => {
      router.push("/orders");
    }, 3000);
    return () => clearTimeout(timer);
  }, [state, router]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
      {(state === "loading" || state === "pending") && (
        <>
          <div className="grid size-20 place-items-center rounded-full bg-primary/10">
            <Clock className="size-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              {state === "loading" ? "Processing Payment…" : "Verifying Payment…"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {state === "loading"
                ? "Please wait while we confirm your payment."
                : `Checking payment status… (attempt ${retries + 1}/${MAX_RETRIES})`}
            </p>
          </div>
          <Spinner className="size-8" />
        </>
      )}

      {state === "paid" && (
        <>
          <div className="grid size-20 place-items-center rounded-full bg-emerald-500/10">
            <CheckCircle className="size-10 text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              Payment Successful! 🎉
            </h1>
            <p className="text-sm text-muted-foreground">
              Your order <strong>{orderId}</strong> has been placed successfully.
            </p>
            <p className="text-xs text-muted-foreground">
              Redirecting to your orders in a moment…
            </p>
          </div>
          <Button onClick={() => router.push("/orders")}>View My Orders</Button>
        </>
      )}

      {state === "failed" && (
        <>
          <div className="grid size-20 place-items-center rounded-full bg-destructive/10">
            <XCircle className="size-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-destructive">
              Payment Failed
            </h1>
            <p className="text-sm text-muted-foreground">
              We could not confirm your payment. Your cart has been restored.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push("/orders")}>
              My Orders
            </Button>
            <Button onClick={() => router.push("/checkout")}>Try Again</Button>
          </div>
        </>
      )}
    </main>
  );
}
