"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { formatINR } from "@/lib/products";

import { useCodEstimate, type CodEstimateData, type CodState } from "@/lib/use-cod-estimate";

export type { CodEstimateData };

export function CodEstimate({
  subtotal,
  qty,
  initialPincode = "",
  onChange,
}: {
  subtotal: number; // rupees
  qty: number;
  initialPincode?: string;
  onChange?: (data: CodEstimateData | null) => void;
}) {
  const [pincode, setPincode] = useState(initialPincode);
  const state = useCodEstimate(pincode, subtotal, qty);

  useEffect(() => {
    if (state.status === "ok") {
      onChange?.(state.data);
    } else {
      onChange?.(null);
    }
  }, [state, onChange]);

  return (
    <div className="space-y-2">
      <label htmlFor="cod-pincode" className="text-sm font-medium">
        Delivery pincode
      </label>
      <Input
        id="cod-pincode"
        inputMode="numeric"
        maxLength={6}
        placeholder="e.g. 122008"
        value={pincode}
        onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
      />

      <div aria-live="polite" className="text-sm">
        {state.status === "loading" && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Spinner /> Checking Cash on Delivery...
          </p>
        )}
        {state.status === "error" && <p className="text-destructive">{state.message}</p>}
        {state.status === "unserviceable" && (
          <p className="text-destructive">Cash on Delivery is not available for this pincode.</p>
        )}
        {state.status === "ok" && (
          <div className="space-y-1 rounded-lg bg-muted/60 p-3">
            <p className="flex justify-between">
              <span>Shipping</span>
              <span>{formatINR(state.data.shipping)}</span>
            </p>
            <p className="flex justify-between">
              <span>COD fee</span>
              <span>{formatINR(state.data.codCharge)}</span>
            </p>
            <p className="flex justify-between border-t pt-1 font-semibold">
              <span>Extra charges</span>
              <span>{formatINR(state.data.total)}</span>
            </p>
            <p className="text-xs text-muted-foreground">Delivery in about {state.data.etaDays} days</p>
          </div>
        )}
      </div>
    </div>
  );
}