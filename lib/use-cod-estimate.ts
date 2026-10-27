"use client";

import { useEffect, useState } from "react";

export type CodEstimateData = {
  serviceable: true;
  courier: string;
  etaDays: number;
  shipping: number;
  codCharge: number;
  total: number;
};

export type CodState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "unserviceable" }
  | { status: "ok"; data: CodEstimateData };

const IDLE_STATE: CodState = { status: "idle" };
const LOADING_STATE: CodState = { status: "loading" };

export function useCodEstimate(pincode: string, subtotal: number, qty: number, enabled = true): CodState {
  const isValid = enabled && /^[1-9]\d{5}$/.test(pincode) && subtotal > 0;
  const currentKey = isValid ? `${pincode}:${subtotal}:${qty}` : "";

  const [result, setResult] = useState<{ key: string; state: CodState } | null>(null);

  useEffect(() => {
    if (!isValid) return;

    const ctrl = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/shipping/cod-estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pincode, orderValue: subtotal, qty }),
          signal: ctrl.signal,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed");
        setResult({
          key: currentKey,
          state: json.serviceable ? { status: "ok", data: json } : { status: "unserviceable" },
        });
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setResult({
          key: currentKey,
          state: { status: "error", message: e instanceof Error ? e.message : "Failed" },
        });
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [isValid, currentKey, pincode, subtotal, qty]);

  if (!isValid) {
    return IDLE_STATE;
  }

  if (!result || result.key !== currentKey) {
    return LOADING_STATE;
  }

  return result.state;
}