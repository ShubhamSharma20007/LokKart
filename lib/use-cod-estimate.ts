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

export function useCodEstimate(pincode: string, subtotal: number, qty: number, enabled = true): CodState {
  const [state, setState] = useState<CodState>({ status: "idle" });

  useEffect(() => {
    if (!enabled || !/^[1-9]\d{5}$/.test(pincode) || subtotal <= 0) {
      setState({ status: "idle" });
      return;
    }

    const ctrl = new AbortController();
    setState({ status: "loading" });

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
        setState(json.serviceable ? { status: "ok", data: json } : { status: "unserviceable" });
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setState({ status: "error", message: e instanceof Error ? e.message : "Failed" });
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [pincode, subtotal, qty, enabled]);

  return state;
}