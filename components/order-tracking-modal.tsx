"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, ExternalLink, Loader2, MapPin, Truck } from "lucide-react";
import { auth } from "@/hooks/useFirebaseAuth";
import { getOrderTracking, type MyOrder, type OrderTrackingResult } from "@/lib/order-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: MyOrder;
};

const STEPS = [
  { key: "PLACED", label: "Order Placed" },
  { key: "CONFIRMED", label: "Packed & Booked" },
  { key: "SHIPPED", label: "In Transit" },
  { key: "DELIVERED", label: "Delivered" },
] as const;

export function OrderTrackingModal({ open, onOpenChange, order }: Props) {
  const [loading, setLoading] = useState(false);
  const [tracking, setTracking] = useState<OrderTrackingResult | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function fetchTracking() {
      setLoading(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        const res = await getOrderTracking(token, order.id);
        if (!cancelled) setTracking(res);
      } catch (err) {
        console.error("Failed to fetch tracking", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchTracking();

    return () => {
      cancelled = true;
    };
  }, [open, order.id]);

  const currentStatusIndex = STEPS.findIndex((s) => s.key === order.status);
  const effectiveIndex = currentStatusIndex === -1 ? 0 : currentStatusIndex;

  const awb = (tracking && "awb" in tracking && tracking.awb) || order.awb;
  const courier = (tracking && "courierName" in tracking && tracking.courierName) || order.courierName;
  const trackingUrl = (tracking && "trackingUrl" in tracking && tracking.trackingUrl) || order.trackingUrl;
  const scans = tracking && "data" in tracking ? tracking.data?.scans ?? [] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="size-5 text-primary" />
            <span>Track Order {order.ref}</span>
          </DialogTitle>
        </DialogHeader>

        {/* 1. Stepper */}
        <div className="py-2">
          <div className="grid grid-cols-4 gap-1 text-center">
            {STEPS.map((step, idx) => {
              const done = idx <= effectiveIndex;
              const isCurrent = idx === effectiveIndex;
              return (
                <div key={step.key} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`grid size-7 place-items-center rounded-full text-xs font-semibold ${
                      done
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                  >
                    {done ? <CheckCircle2 className="size-4" /> : <Circle className="size-3" />}
                  </div>
                  <span
                    className={`text-[11px] leading-tight ${
                      done ? "font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* 2. Courier & AWB Details */}
        {awb ? (
          <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Courier Partner:</span>
              <span className="font-semibold">{courier || "Assigned Courier"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">AWB Tracking No:</span>
              <span className="font-mono font-semibold">{awb}</span>
            </div>
            {trackingUrl && (
              <div className="pt-2 text-right">
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline text-xs"
                >
                  Track on Live Map <ExternalLink className="size-3" />
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-muted/40 p-3 text-center text-xs text-muted-foreground">
            Order confirmed. Our team is packing your parcel; courier partner & tracking AWB will be updated once dispatched.
          </div>
        )}

        {/* 3. Live Scan Activity Timeline */}
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : scans.length > 0 ? (
          <div className="max-h-56 overflow-y-auto space-y-3 pr-1 text-xs">
            <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
              Activity History
            </p>
            {scans.map((scan, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="mt-1 size-2 rounded-full bg-primary shrink-0" />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-medium">{scan.status || scan.remark}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {scan.timestamp ? new Date(scan.timestamp).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }) : ""}
                    </span>
                  </div>
                  {scan.location && (
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="size-3" /> {scan.location}
                    </p>
                  )}
                  {scan.remark && scan.remark !== scan.status && (
                    <p className="text-muted-foreground text-[11px]">{scan.remark}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

